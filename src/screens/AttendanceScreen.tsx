import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Filter, CalendarCheck, Sparkles, LayoutGrid, CalendarDays, FileText, RotateCcw } from 'lucide-react';
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
import { markAttendance } from '../db/repositories/attendance.repo';
import { PageContainer } from '../components/layout/PageContainer';
import { getLabAttendanceRule } from '../utils/preferences';

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

  const handleMarkCourse = async (
    courseId: string,
    status: AttendanceStatus,
    componentType?: 'theory' | 'lab'
  ) => {
    const course = courses.find(c => c.id === courseId);
    const globalLabRule = getLabAttendanceRule();
    const effectiveLabRule = course?.lab_attendance_rule || globalLabRule;

    let weight = 1;
    const targetComp = componentType || (course?.type === 'lab' ? 'lab' : 'theory');

    if (targetComp === 'lab') {
      if (effectiveLabRule === 'single_session') {
        weight = 1;
      } else {
        const labSlot = slots.find(
          s => s.course_id === courseId && (s.component_type === 'lab' || course?.type === 'lab')
        );
        weight = labSlot?.weight || 2;
      }
    }

    await markAttendance({
      course_id: courseId,
      date: todayStr,
      status,
      slot_id: null,
      weight,
      component_type: targetComp,
    });
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
                const labSlot = slots.find(
                  s => s.course_id === course.id && (s.component_type === 'lab' || course.type === 'lab')
                );
                const globalLabRule = getLabAttendanceRule();
                const effectiveLabRule = course.lab_attendance_rule || globalLabRule;
                const labAttendancePoints = effectiveLabRule === 'single_session' ? 1 : (labSlot?.weight || 2);

                return (
                  <CourseAttendanceCard
                    key={course.id}
                    course={course}
                    stats={stats}
                    projection={projection}
                    labAttendancePoints={labAttendancePoints}
                    onMark={(status, component) => handleMarkCourse(course.id, status, component)}
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
    </PageContainer>
  );
};
