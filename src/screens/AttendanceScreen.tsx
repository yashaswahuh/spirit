import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Filter } from 'lucide-react';
import { db } from '../db/dexie';
import { Course, AttendanceStatus } from '../types';
import { computeCourseAttendanceStats } from '../engine/attendance';
import { CourseAttendanceCard } from '../components/attendance/CourseAttendanceCard';
import { SubjectModal } from '../components/attendance/SubjectModal';
import { createCourse, updateCourse, deleteCourse } from '../db/repositories/course.repo';
import { markAttendance } from '../db/repositories/attendance.repo';
import { PageContainer } from '../components/layout/PageContainer';

export const AttendanceScreen: React.FC = () => {
  const profile = useLiveQuery(() => db.profile.filter(p => p.deleted_at === null).first());
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const records = useLiveQuery(() => db.attendance_record.filter(r => r.deleted_at === null).toArray()) || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'danger' | 'safe'>('all');

  const defaultThreshold = profile?.default_attendance_threshold || 75;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Compute stats for all courses
  const courseItems = courses.map(course => {
    const courseRecords = records.filter(r => r.course_id === course.id);
    const stats = computeCourseAttendanceStats(
      courseRecords,
      {
        medical_counts_as_present: course.medical_counts_as_present,
        duty_leave_counts_as_present: course.duty_leave_counts_as_present,
      },
      course.attendance_threshold_override || defaultThreshold
    );
    return { course, stats };
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

  const handleMarkCourse = async (courseId: string, status: AttendanceStatus) => {
    await markAttendance({
      course_id: courseId,
      date: todayStr,
      status,
      slot_id: null,
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
            Subject Attendance
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {courses.length} subjects enrolled in {activeTerm?.name || 'Current Term'}
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCourse(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none min-h-[44px] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

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

      {/* Courses Responsive Grid: 1 col on mobile, 2 on tablet, 2 or 3 on desktop */}
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
          filteredItems.map(({ course, stats }) => (
            <CourseAttendanceCard
              key={course.id}
              course={course}
              stats={stats}
              onMark={status => handleMarkCourse(course.id, status)}
              onEdit={() => {
                setEditingCourse(course);
                setIsModalOpen(true);
              }}
              onDelete={() => handleDeleteCourse(course.id)}
            />
          ))
        )}
      </div>

      {/* Add / Edit Modal (uses ResponsiveDialog) */}
      <SubjectModal
        isOpen={isModalOpen}
        initialCourse={editingCourse}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourse(undefined);
        }}
        onSave={handleSaveCourse}
      />
    </PageContainer>
  );
};
