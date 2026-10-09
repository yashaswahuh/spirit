import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Filter, CalendarCheck, Sparkles, LayoutGrid, CalendarDays, FileText, RotateCcw, AlertTriangle } from 'lucide-react';
import { db } from '../db/dexie';
import { Course, AttendanceStatus } from '../types';
import { computeCourseAttendanceStats, countUnmarkedClasses } from '../engine/attendance';
import { countRemainingScheduledClasses, calculateAttendanceProjection } from '../engine/projection';
import { CourseAttendanceCard } from '../components/attendance/CourseAttendanceCard';
import { SubjectModal } from '../components/attendance/SubjectModal';
import { DayPickerView } from '../components/attendance/DayPickerView';
import { CatchUpModal } from '../components/attendance/CatchUpModal';
import { WhatIfModal } from '../components/attendance/WhatIfModal';
import { CourseCalendarModal } from '../components/attendance/CourseCalendarModal';
import { AttendanceReportModal } from '../components/attendance/AttendanceReportModal';
import { ClearAttendanceModal } from '../components/attendance/ClearAttendanceModal';
import { createCourse, updateCourse, deleteCourse } from '../db/repositories/course.repo';
import { markAttendance, deleteAttendanceRecord, syncAllCoursesAttendanceWeights } from '../db/repositories/attendance.repo';
import { PageContainer } from '../components/layout/PageContainer';
import { ResponsiveDialog } from '../components/layout/ResponsiveDialog';
import { getLabAttendanceRule } from '../utils/preferences';
import { timeToMinutes, resolveDaySchedule, resolveSlotAttendanceWeight } from '../engine/timetable';

export const AttendanceScreen: React.FC = () => {
  const profile = useLiveQuery(() => db.profile.filter(p => p.deleted_at === null).first());
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const records = useLiveQuery(() => db.attendance_record.filter(r => r.deleted_at === null).toArray()) || [];
  const slots = useLiveQuery(() => db.timetable_slot.filter(s => s.deleted_at === null).toArray()) || [];
  const versions = useLiveQuery(() => db.timetable_version.filter(v => v.deleted_at === null).toArray()) || [];
  const overrides = useLiveQuery(() => db.timetable_override.filter(o => o.deleted_at === null).toArray()) || [];
  const calendarEvents = useLiveQuery(() => db.calendar_event.filter(e => e.deleted_at === null).toArray()) || [];

  // Tab View: Subjects Grid vs Date-Picker Day View
  const [activeTab, setActiveTab] = useState<'subjects' | 'day_log'>('subjects');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | undefined>();
  const [calendarCourse, setCalendarCourse] = useState<Course | undefined>();
  const [isCatchUpOpen, setIsCatchUpOpen] = useState(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isClearAttendanceOpen, setIsClearAttendanceOpen] = useState(false);
  const [clearInitialCourseId, setClearInitialCourseId] = useState<string | null>(null);

  // Extra Class Confirmation Dialog State
  interface PendingExtraClass {
    course: Course;
    status: AttendanceStatus;
    componentType?: 'theory' | 'lab';
    weight: number;
    reason: 'scheduled_already_marked' | 'unscheduled_day' | 'duplicate_session';
    currentAttended: number;
    currentConducted: number;
  }
  const [pendingExtraClass, setPendingExtraClass] = useState<PendingExtraClass | null>(null);

  const handleConfirmExtraClass = async () => {
    if (!pendingExtraClass) return;
    await markAttendance({
      course_id: pendingExtraClass.course.id,
      date: todayStr,
      status: pendingExtraClass.status,
      slot_id: null,
      weight: pendingExtraClass.weight,
      component_type: pendingExtraClass.componentType,
      createNew: true,
    });
    setPendingExtraClass(null);
  };

  const handleCancelExtraClass = () => {
    setPendingExtraClass(null);
  };

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'danger' | 'safe'>('all');

  const defaultThreshold = profile?.default_attendance_threshold || 75;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Unmarked classes count in past
  const unmarkedCount = countUnmarkedClasses({
    startDate: activeTerm?.start_date || todayStr,
    endDate: todayStr,
    slots,
    versions,
    overrides,
    calendarEvents,
    records,
    courses,
    workingDays: activeTerm?.working_days || [1, 2, 3, 4, 5, 6],
    saturdayRule: activeTerm?.saturday_rule,
  });

  // Compute stats and projections for all courses
  const courseItems = courses.map(course => {
    const courseRecords = records.filter(r => r.course_id === course.id);
    const threshold = course.attendance_threshold_override || defaultThreshold;

    const stats = computeCourseAttendanceStats(
      courseRecords,
      {
        medical_counts_as_present: course.medical_counts_as_present,
        duty_leave_counts_as_present: course.duty_leave_counts_as_present,
      },
      threshold,
      {
        initialAttended: course.initial_attended,
        initialConducted: course.initial_conducted,
        trackingStartDate: course.tracking_start_date,
        slots,
        courseType: course.type,
        labAttendanceRule: course.lab_attendance_rule,
        globalLabRule: getLabAttendanceRule(),
      }
    );

    const remainingClasses = activeTerm?.end_date && todayStr <= activeTerm.end_date
      ? countRemainingScheduledClasses(
          course.id,
          todayStr,
          activeTerm.end_date,
          slots,
          calendarEvents,
          {
            versions,
            overrides,
            workingDays: activeTerm.working_days || [1, 2, 3, 4, 5, 6],
          }
        )
      : 0;

    const proj = calculateAttendanceProjection({
      attended: stats.attended,
      conducted: stats.conducted,
      threshold,
      remainingClasses,
    });

    return {
      course,
      stats,
      projection: {
        bestCase: proj.best_case_percentage,
        worstCase: proj.worst_case_percentage,
        remainingClasses,
        classesNeeded: proj.classes_needed_to_finish_at_threshold,
      },
    };
  });

  // Filter and search
  const filteredItems = courseItems.filter(({ course, stats }) => {
    const matchesSearch =
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'danger') return stats.is_in_danger;
    if (filterMode === 'safe') return !stats.is_in_danger && stats.conducted > 0;
    return true;
  });

  const handleSaveCourse = async (data: any) => {
    if (!activeTerm) return;

    if (editingCourse) {
      await updateCourse(editingCourse.id, data);
    } else {
      await createCourse({
        ...data,
        term_id: activeTerm.id,
        counts_toward_gpa: data.type !== 'audit',
      });
    }
    setEditingCourse(undefined);
  };

  // Sync existing attendance weights across all courses on mount to fix any past inconsistent records
  useEffect(() => {
    syncAllCoursesAttendanceWeights().catch(() => {});
  }, []);

  const handleMarkCourse = async (
    courseId: string,
    status: AttendanceStatus,
    componentType?: 'theory' | 'lab'
  ) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const globalLabRule = getLabAttendanceRule();
    const effectiveLabRule = course?.lab_attendance_rule || globalLabRule;

    const courseSlots = slots.filter(s => s.course_id === courseId);
    const isCourseLab = course?.type === 'lab';
    const targetComp = componentType || (isCourseLab ? 'lab' : 'theory');

    // Find any multi-period slot for this course
    const multiSlot = courseSlots.find(s => {
      const diffMins = (s.start_time && s.end_time)
        ? timeToMinutes(s.end_time) - timeToMinutes(s.start_time)
        : 0;
      return (s.weight && s.weight > 1) || s.component_type === 'lab' || diffMins >= 90;
    });

    let weight = 1;
    if (effectiveLabRule === 'single_session') {
      weight = 1;
    } else {
      if (course?.type === 'theory_and_lab') {
        if (targetComp === 'lab') {
          weight = multiSlot?.weight && multiSlot.weight > 1 ? multiSlot.weight : 2;
        } else {
          weight = 1;
        }
      } else if (multiSlot) {
        weight = multiSlot.weight && multiSlot.weight > 1 ? multiSlot.weight : 2;
      } else if (isCourseLab) {
        weight = 2;
      } else {
        weight = 1;
      }
    }

    // Check today's schedule for this course
    const todayRes = resolveDaySchedule({
      date: todayStr,
      versions,
      slots,
      calendarEvents,
      overrides,
      workingDays: activeTerm?.working_days || [1, 2, 3, 4, 5, 6],
      saturdayRule: activeTerm?.saturday_rule,
      courses,
      labAttendanceRule: globalLabRule,
    });

    const courseTodaySlots = todayRes.slots.filter(s => s.course_id === courseId);
    const courseRecordsToday = records.filter(
      r => r.course_id === courseId && r.date === todayStr && !r.deleted_at
    );

    // Compute current stats for dialog preview
    const courseStats = computeCourseAttendanceStats(
      records.filter(r => r.course_id === courseId),
      {
        medical_counts_as_present: course.medical_counts_as_present,
        duty_leave_counts_as_present: course.duty_leave_counts_as_present,
      },
      course.attendance_threshold_override || defaultThreshold,
      {
        initialAttended: course.initial_attended,
        initialConducted: course.initial_conducted,
        trackingStartDate: course.tracking_start_date,
        slots,
        courseType: course.type,
        labAttendanceRule: course.lab_attendance_rule,
        globalLabRule,
      }
    );

    // Guard: Prevent excessive sessions on a single date (cap at 3)
    if (courseRecordsToday.length >= 3) {
      alert(`Maximum 3 sessions can be recorded for ${course.name} on a single date. Please check your timetable or edit subject details.`);
      return;
    }

    // Case 1: Course has scheduled slots on today's timetable
    if (courseTodaySlots.length > 0) {
      // Find first unmarked scheduled slot for today
      const unmarkedSlot = courseTodaySlots.find(s => {
        if (targetComp && s.component_type && s.component_type !== targetComp) return false;
        return !records.some(r => r.course_id === courseId && r.date === todayStr && r.slot_id === s.slot_id && !r.deleted_at);
      });

      if (unmarkedSlot && unmarkedSlot.slot_id) {
        // Mark the scheduled slot
        const slotDef = slots.find(s => s.id === unmarkedSlot.slot_id);
        const slotWeight = resolveSlotAttendanceWeight(slotDef || (unmarkedSlot as any), course, globalLabRule);
        await markAttendance({
          course_id: courseId,
          date: todayStr,
          status,
          slot_id: unmarkedSlot.slot_id,
          weight: slotWeight,
          component_type: unmarkedSlot.component_type || targetComp,
        });
        return;
      }

      // All scheduled slots for today are marked!
      // If there is exactly 1 record today and user clicked a DIFFERENT status, update that record without inflating count!
      if (courseRecordsToday.length === 1 && courseRecordsToday[0].status !== status) {
        await markAttendance({
          course_id: courseId,
          date: todayStr,
          status,
          slot_id: courseRecordsToday[0].slot_id,
          weight: courseRecordsToday[0].weight || weight,
          component_type: targetComp,
          createNew: false,
        });
        return;
      }

      // If user clicked the SAME status (or already has extra classes), require explicit confirmation to add an extra makeup class!
      setPendingExtraClass({
        course,
        status,
        componentType: targetComp,
        weight,
        reason: 'scheduled_already_marked',
        currentAttended: courseStats.attended,
        currentConducted: courseStats.conducted,
      });
      return;
    }

    // Case 2: No scheduled slots on today's timetable
    // Check if course has slots on other days (meaning student uses timetable, but NSS is not on today's timetable)
    const hasAnySlots = slots.some(s => s.course_id === courseId);

    if (hasAnySlots && courseRecordsToday.length === 0) {
      // Unscheduled day on timetable! Confirm before adding makeup class
      setPendingExtraClass({
        course,
        status,
        componentType: targetComp,
        weight,
        reason: 'unscheduled_day',
        currentAttended: courseStats.attended,
        currentConducted: courseStats.conducted,
      });
      return;
    }

    // If already has 1 record today and user clicked a DIFFERENT status, switch/correct it!
    if (courseRecordsToday.length === 1 && courseRecordsToday[0].status !== status) {
      await markAttendance({
        course_id: courseId,
        date: todayStr,
        status,
        slot_id: courseRecordsToday[0].slot_id,
        weight: courseRecordsToday[0].weight || weight,
        component_type: targetComp,
        createNew: false,
      });
      return;
    }

    // If already has 1 record today and user clicked the SAME status: confirm extra session!
    if (courseRecordsToday.length >= 1) {
      setPendingExtraClass({
        course,
        status,
        componentType: targetComp,
        weight,
        reason: 'duplicate_session',
        currentAttended: courseStats.attended,
        currentConducted: courseStats.conducted,
      });
      return;
    }

    // No timetable used and 0 records today: log 1st class for today directly!
    await markAttendance({
      course_id: courseId,
      date: todayStr,
      status,
      slot_id: null,
      weight,
      component_type: targetComp,
      createNew: true,
    });
  };

  const handleUndoCourseMark = async (courseId: string) => {
    const courseRecordsToday = records.filter(
      r => r.course_id === courseId && r.date === todayStr && !r.deleted_at
    );
    if (courseRecordsToday.length === 0) return;

    // Pick the most recently updated/created record today
    const sorted = [...courseRecordsToday].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const target = sorted[0];
    await deleteAttendanceRecord(target.id);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm('Are you sure you want to delete this subject? Past logs will be archived.')) {
      await deleteCourse(courseId);
    }
  };

  return (
    <PageContainer maxWidth="xl" className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Attendance Management
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {courses.length} subjects enrolled in {activeTerm?.name || 'Current Term'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Catch Up Button */}
          <button
            type="button"
            onClick={() => setIsCatchUpOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[42px] border ${
              unmarkedCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-amber-600" />
            Catch Up
            {unmarkedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black">
                {unmarkedCount}
              </span>
            )}
          </button>

          {/* What-If Planner */}
          <button
            type="button"
            onClick={() => setIsWhatIfOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 transition-all min-h-[42px]"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            What-If Planner
          </button>

          {/* Attendance Report */}
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 hover:bg-gray-50 transition-all min-h-[42px]"
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            Report
          </button>

          {/* Clear Logs */}
          <button
            type="button"
            onClick={() => {
              setClearInitialCourseId(null);
              setIsClearAttendanceOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all min-h-[42px]"
            title="Clear logged attendance data without deleting subjects or timetable"
          >
            <RotateCcw className="w-4 h-4 text-rose-500" />
            Clear Logs
          </button>

          {/* Add Subject */}
          {activeTab === 'subjects' && (
            <button
              onClick={() => {
                setEditingCourse(undefined);
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm py-2 px-3.5 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              Add Subject
            </button>
          )}
        </div>
      </div>

      {/* Main Mode Switcher: Subjects vs Day Log */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'subjects'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Subjects Overview ({courses.length})
        </button>

        <button
          onClick={() => setActiveTab('day_log')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'day_log'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Day-by-Day Log
        </button>
      </div>

      {/* Content depending on active tab */}
      {activeTab === 'day_log' ? (
        <DayPickerView />
      ) : (
        <>
          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search subjects by name or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px]"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <Filter className="w-3.5 h-3.5 text-gray-400 mr-1 hidden sm:inline-block" />
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-2 rounded-xl font-semibold transition-all min-h-[38px] ${
                  filterMode === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All ({courseItems.length})
              </button>
              <button
                onClick={() => setFilterMode('danger')}
                className={`px-3 py-2 rounded-xl font-semibold transition-all min-h-[38px] ${
                  filterMode === 'danger'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Danger ({courseItems.filter(i => i.stats.is_in_danger).length})
              </button>
              <button
                onClick={() => setFilterMode('safe')}
                className={`px-3 py-2 rounded-xl font-semibold transition-all min-h-[38px] ${
                  filterMode === 'safe'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Safe ({courseItems.filter(i => !i.stats.is_in_danger && i.stats.conducted > 0).length})
              </button>
            </div>
          </div>

          {/* Courses Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {filteredItems.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No subjects found matching your criteria.
                </p>
                <button
                  onClick={() => {
                    setEditingCourse(undefined);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add your first subject
                </button>
              </div>
            ) : (
              filteredItems.map(({ course, stats, projection }) => {
                const courseSlots = slots.filter(s => s.course_id === course.id);
                const multiSlot = courseSlots.find(s => {
                  const diffMins = (s.start_time && s.end_time)
                    ? timeToMinutes(s.end_time) - timeToMinutes(s.start_time)
                    : 0;
                  return (s.weight && s.weight > 1) || s.component_type === 'lab' || diffMins >= 90;
                });
                const globalLabRule = getLabAttendanceRule();
                const effectiveLabRule = course.lab_attendance_rule || globalLabRule;
                const naturalWeight = multiSlot?.weight && multiSlot.weight > 1 ? multiSlot.weight : (course.type === 'lab' ? 2 : 1);
                const subjectAttendancePoints = effectiveLabRule === 'single_session' ? 1 : naturalWeight;

                return (
                  <CourseAttendanceCard
                    key={course.id}
                    course={course}
                    stats={stats}
                    todayRecords={records.filter(r => r.course_id === course.id && r.date === todayStr && !r.deleted_at)}
                    projection={projection}
                    labAttendancePoints={subjectAttendancePoints}
                    onMark={(status, component) => handleMarkCourse(course.id, status, component)}
                    onUndo={() => handleUndoCourseMark(course.id)}
                    onEdit={() => {
                      setEditingCourse(course);
                      setIsModalOpen(true);
                    }}
                    onDelete={() => handleDeleteCourse(course.id)}
                    onViewCalendar={() => setCalendarCourse(course)}
                    onClearAttendance={() => {
                      setClearInitialCourseId(course.id);
                      setIsClearAttendanceOpen(true);
                    }}
                  />
                );
              })
            )}
          </div>
        </>
      )}

      {/* Add / Edit Subject Modal */}
      <SubjectModal
        isOpen={isModalOpen}
        initialCourse={editingCourse}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourse(undefined);
        }}
        onSave={handleSaveCourse}
      />

      {/* Course Calendar & Heatmap Modal */}
      {calendarCourse && (
        <CourseCalendarModal
          isOpen={!!calendarCourse}
          course={calendarCourse}
          onClose={() => setCalendarCourse(undefined)}
        />
      )}

      {/* Catch-Up Modal */}
      <CatchUpModal
        isOpen={isCatchUpOpen}
        onClose={() => setIsCatchUpOpen(false)}
      />

      {/* What-If Planner Modal */}
      <WhatIfModal
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
        courses={courses}
        profileThreshold={defaultThreshold}
      />

      {/* Attendance Report Modal */}
      {isReportOpen && (
        <AttendanceReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {/* Clear Attendance Modal */}
      {isClearAttendanceOpen && (
        <ClearAttendanceModal
          isOpen={isClearAttendanceOpen}
          onClose={() => {
            setIsClearAttendanceOpen(false);
            setClearInitialCourseId(null);
          }}
          initialCourseId={clearInitialCourseId}
        />
      )}

      {/* Extra / Makeup Class Confirmation Modal */}
      {pendingExtraClass && (
        <ResponsiveDialog
          isOpen={!!pendingExtraClass}
          onClose={handleCancelExtraClass}
          title="Log Extra / Makeup Class?"
          description={`Confirm adding an extra class session for ${pendingExtraClass.course.name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>
                  {pendingExtraClass.reason === 'unscheduled_day'
                    ? 'No Class Scheduled Today'
                    : 'Today’s Scheduled Class Already Logged'}
                </span>
              </div>
              <p className="text-amber-700 dark:text-amber-300">
                {pendingExtraClass.reason === 'unscheduled_day'
                  ? `No class for ${pendingExtraClass.course.name} is on today's timetable. Did your professor hold an extra / unscheduled makeup class today?`
                  : `You have already logged today's class for ${pendingExtraClass.course.name}. Did your professor conduct an additional makeup lecture or extra session today?`}
              </p>
            </div>

            {/* Attendance Impact Preview */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                <span>Current Total Conducted:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {pendingExtraClass.currentAttended} / {pendingExtraClass.currentConducted}
                </span>
              </div>
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                <span>After Extra Class ({pendingExtraClass.status}):</span>
                <span className="font-mono">
                  {pendingExtraClass.status === 'present'
                    ? `${pendingExtraClass.currentAttended + pendingExtraClass.weight} / ${pendingExtraClass.currentConducted + pendingExtraClass.weight}`
                    : `${pendingExtraClass.currentAttended} / ${pendingExtraClass.currentConducted + pendingExtraClass.weight}`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelExtraClass}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer min-h-[40px]"
              >
                Cancel (Keep {pendingExtraClass.currentConducted})
              </button>
              <button
                type="button"
                onClick={handleConfirmExtraClass}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors cursor-pointer min-h-[40px]"
              >
                Yes, Add Extra Class (+1)
              </button>
            </div>
          </div>
        </ResponsiveDialog>
      )}
    </PageContainer>
  );
};
