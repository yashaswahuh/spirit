import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Sun,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Course } from '../../types';
import { CanISkipTomorrowResult } from '../../engine/whatif';

interface CanISkipTomorrowCardProps {
  result: CanISkipTomorrowResult;
  courseMap: Map<string, Course>;
  onOpenWhatIfModal: () => void;
}

export const CanISkipTomorrowCard: React.FC<CanISkipTomorrowCardProps> = ({
  result,
  courseMap,
  onOpenWhatIfModal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // If tomorrow is holiday
  if (result.is_holiday) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Tomorrow: {result.holiday_note || 'Holiday'}!
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              No classes scheduled for tomorrow ({result.date}). Enjoy your day off!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWhatIfModal}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          Planner <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // If tomorrow has no classes
  if (!result.has_classes) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              No Classes Tomorrow ({result.date})
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              No instructional lectures or lab slots on the schedule for tomorrow.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWhatIfModal}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          Planner <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl p-5 border transition-all shadow-sm ${
        result.can_skip_all
          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
          : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
              result.can_skip_all
                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300'
            }`}
          >
            {result.can_skip_all ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                Can I Skip Tomorrow? ({result.date})
              </span>
            </div>

            <h3 className="text-base font-black text-gray-900 dark:text-white mt-0.5">
              {result.can_skip_all ? (
                <span className="text-emerald-700 dark:text-emerald-300">
                  Yes, you can safely skip tomorrow!
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-300">
                  Warning: {result.in_danger_courses_count} subject(s) would drop into danger!
                </span>
              )}
            </h3>

            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {result.can_skip_all
                ? "Bunking tomorrow's classes will keep all your subjects above required attendance thresholds."
                : "Missing tomorrow's lectures will push one or more subjects below required thresholds."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenWhatIfModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Planner
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Toggle details"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Per-Subject Breakdown */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 space-y-2 animate-fade-in">
          <h5 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Tomorrow&apos;s Class Impact Breakdown:
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.subjects
              .filter(s => s.classes_tomorrow > 0)
              .map(s => {
                const course = courseMap.get(s.course_id);
                return (
                  <div
                    key={s.course_id}
                    className="p-2.5 rounded-xl bg-white dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: course?.color || '#6366f1' }}
                      />
                      <div className="truncate">
                        <p className="font-bold text-gray-900 dark:text-white truncate">
                          {s.course_name}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {s.classes_tomorrow} {s.classes_tomorrow === 1 ? 'class' : 'classes'} tomorrow
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          s.can_skip
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {s.can_skip ? 'Safe' : 'Danger'} &rarr; {s.new_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
