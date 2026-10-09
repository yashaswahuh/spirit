import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, MoreVertical, Plus, Minus, X, RotateCcw, Check } from 'lucide-react';
import { Course, AttendanceStatus, AttendanceRecord } from '../../types';
import { AttendanceStats } from '../../types';

interface CourseAttendanceCardProps {
  course: Course;
  stats: AttendanceStats;
  todayRecords?: AttendanceRecord[];
  todaySlotsCount?: number;
  maxConductedTillToday?: number;
  hasTimetable?: boolean;
  onMark: (status: AttendanceStatus, componentType?: 'theory' | 'lab') => void;
  onUndo?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewCalendar?: () => void;
  onClearAttendance?: () => void;
  projection?: {
    bestCase: number;
    worstCase: number;
    remainingClasses: number;
    classesNeeded: number;
  };
  labAttendancePoints?: number;
}

export const CourseAttendanceCard: React.FC<CourseAttendanceCardProps> = ({
  course,
  stats,
  todayRecords = [],
  todaySlotsCount,
  maxConductedTillToday,
  hasTimetable = false,
  onMark,
  onUndo,
  onEdit,
  onDelete,
  onViewCalendar,
  onClearAttendance,
  projection,
  labAttendancePoints = 1,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [selectedComponent, setSelectedComponent] = React.useState<'theory' | 'lab'>('theory');
  const isSafe = !stats.is_in_danger;
  const pctDisplay = stats.conducted > 0 ? `${stats.percentage.toFixed(1)}%` : 'No Classes';

  const isIntegrated = course.type === 'theory_and_lab';
  const effectivePoints = isIntegrated
    ? (selectedComponent === 'lab' ? labAttendancePoints : 1)
    : (labAttendancePoints || 1);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 relative">
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
              {course.type === 'theory_and_lab' ? 'Theory + Lab' : course.type} • {course.credits} cr
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mt-1 truncate">
            {course.name}
          </h2>
          {course.faculty && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate flex items-center gap-1" title={course.faculty}>
              <span className="opacity-75">Prof:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{course.faculty}</span>
            </p>
          )}
        </div>

        {/* Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Course options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-40 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 text-xs animate-fade-in">
              {onViewCalendar && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onViewCalendar();
                  }}
                  className="w-full text-left px-3.5 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 font-medium transition-colors"
                >
                  View Calendar
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="w-full text-left px-3.5 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 font-medium transition-colors"
                >
                  Edit Subject
                </button>
              )}
              {onClearAttendance && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onClearAttendance();
                  }}
                  className="w-full text-left px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium transition-colors"
                >
                  Clear Subject Attendance
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full text-left px-3.5 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium transition-colors"
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
      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden mt-3">
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
      <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400 font-medium">
          {stats.attended} of {stats.conducted} attended
          {course.initial_conducted ? (
            <span className="text-[10px] text-gray-400 block font-mono">
              (Includes {course.initial_attended}/{course.initial_conducted} portal balance)
            </span>
          ) : null}
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

      {/* Semester Projection Strip */}
      {projection && projection.remainingClasses > 0 && (
        <div className="mt-2.5 p-2.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-[11px] flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300 font-medium">
            Projections ({projection.remainingClasses} left):
          </span>
          <span className="font-mono font-bold text-gray-700 dark:text-gray-200">
            Best: <span className="text-emerald-600 dark:text-emerald-400">{projection.bestCase.toFixed(1)}%</span> | Worst: <span className="text-rose-600 dark:text-rose-400">{projection.worstCase.toFixed(1)}%</span>
          </span>
        </div>
      )}

      {/* Theory vs Practical Breakdown if Integrated Course */}
      {course.type === 'theory_and_lab' && stats.theory && stats.lab && (stats.theory.conducted > 0 || stats.lab.conducted > 0) && (
        <div className="mt-2.5 p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-700 dark:text-gray-300">📘 Theory:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100 font-semibold">
              {stats.theory.attended}/{stats.theory.conducted} ({stats.theory.percentage.toFixed(0)}%)
            </span>
          </div>
          <span className="text-gray-300 dark:text-gray-600 font-bold">•</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-700 dark:text-gray-300">🧪 Lab:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100 font-semibold">
              {stats.lab.attended}/{stats.lab.conducted} ({stats.lab.percentage.toFixed(0)}%)
            </span>
          </div>
        </div>
      )}

      {/* Component selector for integrated Theory + Lab courses */}
      {isIntegrated && (
        <div className="mt-3 flex items-center bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setSelectedComponent('theory')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedComponent === 'theory'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            📘 Theory (+1 pt)
          </button>
          <button
            type="button"
            onClick={() => setSelectedComponent('lab')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedComponent === 'lab'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            🧪 Lab (+{labAttendancePoints} {labAttendancePoints === 1 ? 'pt' : 'pts'})
          </button>
        </div>
      )}

      {/* Today's Logged Sessions Strip & Undo Button */}
      {todayRecords.length > 0 && (
        <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Marked today:</span>
            {todayRecords.filter(r => r.status === 'present').length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                +{todayRecords.filter(r => r.status === 'present').length} Present
              </span>
            )}
            {todayRecords.filter(r => r.status === 'absent').length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 font-bold text-[10px]">
                +{todayRecords.filter(r => r.status === 'absent').length} Missed
              </span>
            )}
            {todayRecords.filter(r => r.status === 'cancelled').length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                {todayRecords.filter(r => r.status === 'cancelled').length} Cancelled
              </span>
            )}
          </div>
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-rose-600 dark:text-gray-300 dark:hover:text-rose-400 px-2 py-0.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="Undo last session marked today"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
          )}
        </div>
      )}

      {/* Quick Attendance Marking Row */}
      {(() => {
        const singleTodayRecord = todayRecords.length === 1 ? todayRecords[0] : undefined;
        const isTodayPresent = singleTodayRecord?.status === 'present';
        const isTodayAbsent = singleTodayRecord?.status === 'absent';
        const isTodayCancelled = singleTodayRecord?.status === 'cancelled';
        const isScheduledToday = hasTimetable ? (todaySlotsCount || 0) > 0 : true;
        const maxLimit = maxConductedTillToday ?? stats.conducted;
        const isFullyLoggedToday = hasTimetable && isScheduledToday
          ? todayRecords.length >= (todaySlotsCount || 1)
          : todayRecords.length > 0;

        return (
          <div className="space-y-1.5">
            <div className={`${isIntegrated ? 'mt-2' : 'mt-3'} grid grid-cols-3 gap-2`}>
              <button
                type="button"
                onClick={() =>
                  onMark(
                    'present',
                    isIntegrated ? selectedComponent : (course.type === 'lab' ? 'lab' : 'theory')
                  )
                }
                className={`flex items-center justify-center gap-1 py-2 px-2.5 rounded-2xl text-xs transition-all min-h-[42px] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer active:scale-[0.97] ${
                  isTodayPresent
                    ? 'bg-emerald-600 text-white shadow-md font-bold ring-2 ring-emerald-500 dark:ring-emerald-400'
                    : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                }`}
                title={
                  isTodayPresent
                    ? `Today marked Present (${stats.conducted} of ${maxLimit} lectures conducted)`
                    : !isScheduledToday
                    ? `No lecture scheduled today for ${course.name} (${stats.conducted} conducted till today)`
                    : isTodayAbsent
                    ? `Switch today's mark to Present`
                    : `Mark Present (+${effectivePoints} Attended, +${effectivePoints} Conducted)`
                }
              >
                {isTodayPresent ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Present</span>
                {effectivePoints > 1 && <span className="text-[10px] font-bold opacity-80">(+{effectivePoints})</span>}
              </button>

              <button
                type="button"
                onClick={() =>
                  onMark(
                    'absent',
                    isIntegrated ? selectedComponent : (course.type === 'lab' ? 'lab' : 'theory')
                  )
                }
                className={`flex items-center justify-center gap-1 py-2 px-2.5 rounded-2xl text-xs transition-all min-h-[42px] focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer active:scale-[0.97] ${
                  isTodayAbsent
                    ? 'bg-rose-600 text-white shadow-md font-bold ring-2 ring-rose-500 dark:ring-rose-400'
                    : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold'
                }`}
                title={
                  isTodayAbsent
                    ? `Today marked Absent (${stats.conducted} of ${maxLimit} lectures conducted)`
                    : !isScheduledToday
                    ? `No lecture scheduled today for ${course.name} (${stats.conducted} conducted till today)`
                    : isTodayPresent
                    ? `Switch today's mark to Absent`
                    : `Mark Absent (+0 Attended, +${effectivePoints} Conducted)`
                }
              >
                {isTodayAbsent ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Minus className="w-3.5 h-3.5" />}
                <span>Absent</span>
                {effectivePoints > 1 && <span className="text-[10px] font-bold opacity-80">(-{effectivePoints})</span>}
              </button>

              <button
                type="button"
                onClick={() =>
                  onMark(
                    'cancelled',
                    isIntegrated ? selectedComponent : (course.type === 'lab' ? 'lab' : 'theory')
                  )
                }
                className={`flex items-center justify-center gap-1 py-2 px-2.5 rounded-2xl text-xs transition-all min-h-[42px] focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none cursor-pointer active:scale-[0.97] ${
                  isTodayCancelled
                    ? 'bg-amber-600 text-white shadow-md font-bold ring-2 ring-amber-500 dark:ring-amber-400'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium'
                }`}
                title={
                  isTodayCancelled
                    ? `Today marked Cancelled (${stats.conducted} lectures conducted)`
                    : !isScheduledToday
                    ? `No lecture scheduled today for ${course.name}`
                    : 'Mark Cancelled (Excluded from totals)'
                }
              >
                {isTodayCancelled ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <X className="w-3.5 h-3.5" />}
                <span>Cancelled</span>
              </button>
            </div>

            {/* Informative status footnote */}
            {hasTimetable && !isScheduledToday && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center font-medium pt-0.5">
                📅 No lecture scheduled today • {stats.conducted} conducted till today
              </p>
            )}
            {hasTimetable && isScheduledToday && isFullyLoggedToday && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 text-center font-medium pt-0.5">
                ✓ All scheduled lectures for today are logged ({stats.conducted} of {maxLimit})
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
};
