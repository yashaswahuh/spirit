import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, MoreVertical, Plus, Minus, X } from 'lucide-react';
import { Course, AttendanceStatus } from '../../types';
import { AttendanceStats } from '../../types';

interface CourseAttendanceCardProps {
  course: Course;
  stats: AttendanceStats;
  onMark: (status: AttendanceStatus) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const CourseAttendanceCard: React.FC<CourseAttendanceCardProps> = ({
  course,
  stats,
  onMark,
  onEdit,
  onDelete,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const isSafe = !stats.is_in_danger;
  const pctDisplay = stats.conducted > 0 ? `${stats.percentage.toFixed(1)}%` : 'No Classes';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm relative transition-all">
      {/* Top Header: Code, Name, Credits & Menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: course.color || '#6366f1' }}
            />
            {course.code && (
              <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400 uppercase">
                {course.code}
              </span>
            )}
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {course.type} • {course.credits} cr
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mt-1 truncate">
            {course.name}
          </h2>
        </div>

        {/* Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[32px] min-w-[32px] flex items-center justify-center"
            aria-label="Course options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 text-xs">
              {onEdit && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="w-full text-left px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                >
                  Edit Subject
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full text-left px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
                >
                  Delete Subject
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Percentage & Status Banner (Never color alone: icon + text + color) */}
      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {pctDisplay}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5 font-medium">
            (Target: {stats.threshold}%)
          </span>
        </div>

        {/* Status Badge */}
        {stats.conducted === 0 ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            Not Started
          </span>
        ) : isSafe ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Safe
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            In Danger
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden mt-2.5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            stats.conducted === 0
              ? 'bg-gray-300 dark:bg-gray-700'
              : isSafe
              ? 'bg-emerald-500'
              : 'bg-rose-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, stats.percentage))}%` }}
        />
      </div>

      {/* Bunk / Must-Attend Insight Strip */}
      <div className="mt-3 pt-2.5 border-t border-gray-50 dark:border-gray-800/80 flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400 font-medium">
          {stats.attended} of {stats.conducted} attended
        </span>

        {isSafe ? (
          <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            Can skip: <strong className="text-sm font-bold">{stats.safe_bunks}</strong> {stats.safe_bunks === 1 ? 'class' : 'classes'}
          </span>
        ) : (
          <span className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1">
            Must attend: <strong className="text-sm font-bold">{stats.must_attend === Infinity ? 'Unattainable' : stats.must_attend}</strong> {stats.must_attend === 1 ? 'class' : 'classes'}
          </span>
        )}
      </div>

      {/* Quick Attendance Marking Row */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => onMark('present')}
          className="flex items-center justify-center gap-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold rounded-xl text-xs transition-colors min-h-[40px] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          title="Mark Present (+1 Attended, +1 Conducted)"
        >
          <Plus className="w-3.5 h-3.5" />
          Present
        </button>
        <button
          onClick={() => onMark('absent')}
          className="flex items-center justify-center gap-1 py-2 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold rounded-xl text-xs transition-colors min-h-[40px] focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
          title="Mark Absent (+0 Attended, +1 Conducted)"
        >
          <Minus className="w-3.5 h-3.5" />
          Absent
        </button>
        <button
          onClick={() => onMark('cancelled')}
          className="flex items-center justify-center gap-1 py-2 px-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl text-xs transition-colors min-h-[40px] focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none"
          title="Mark Cancelled (Excluded from totals)"
        >
          <X className="w-3.5 h-3.5" />
          Cancelled
        </button>
      </div>
    </div>
  );
};
