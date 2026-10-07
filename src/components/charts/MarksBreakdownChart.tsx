import React from 'react';
import { Layers } from 'lucide-react';
import { ComponentContribution } from '../../engine/marks';

interface MarksBreakdownChartProps {
  courseName: string;
  components: ComponentContribution[];
  totalEvaluatedMarks: number;
  totalMaxMarks: number;
}

export const MarksBreakdownChart: React.FC<MarksBreakdownChartProps> = ({
  courseName,
  components,
  totalEvaluatedMarks,
  totalMaxMarks,
}) => {
  if (components.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-gray-800">
        No assessment components recorded for this course.
      </div>
    );
  }

  const scorePct = totalMaxMarks > 0 ? (totalEvaluatedMarks / totalMaxMarks) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Marks Breakdown • {courseName}
          </h4>
        </div>
        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
          {totalEvaluatedMarks.toFixed(1)} / {totalMaxMarks.toFixed(1)} ({scorePct.toFixed(1)}%)
        </span>
      </div>

      <div className="space-y-3">
        {components.map((comp) => {
          const compPct = comp.max_marks > 0 ? (comp.obtained_marks / comp.max_marks) * 100 : 0;

          return (
            <div key={comp.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-bold truncate ${comp.is_dropped_or_excluded ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {comp.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    ({comp.weightage}% weight)
                  </span>
                  {comp.status === 'not_held' && (
                    <span className="px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold">
                      Not Held
                    </span>
                  )}
                  {comp.status === 'absent' && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 text-[10px] font-bold">
                      Absent
                    </span>
                  )}
                </div>

                <span className="font-mono text-gray-700 dark:text-gray-300 font-bold flex-shrink-0">
                  {comp.status === 'not_held'
                    ? `Pending / ${comp.max_marks}`
                    : `${comp.obtained_marks} / ${comp.max_marks} (${compPct.toFixed(0)}%)`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    comp.is_dropped_or_excluded
                      ? 'bg-gray-300 dark:bg-gray-600'
                      : compPct >= 75
                      ? 'bg-emerald-500'
                      : compPct >= 40
                      ? 'bg-indigo-600'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, compPct))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
