import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Course } from '../../types';

export interface CourseAttendanceChartItem {
  course: Course;
  percentage: number;
  attended: number;
  conducted: number;
  threshold: number;
  isInDanger: boolean;
  safeBunks: number;
  mustAttend: number;
}

interface AttendanceThresholdChartProps {
  data: CourseAttendanceChartItem[];
  defaultThreshold?: number;
}

export const AttendanceThresholdChart: React.FC<AttendanceThresholdChartProps> = ({
  data,
  defaultThreshold = 75,
}) => {
  if (data.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-gray-800">
        No attendance records found yet.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Attendance vs Institutional Cutoff ({defaultThreshold}%)
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Safe (&gt;= {defaultThreshold}%)
          </span>
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            At Risk
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {data.map(item => {
          const courseThreshold = item.threshold || defaultThreshold;
          const isDanger = item.isInDanger;

          return (
            <div key={item.course.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.course.color || '#6366f1' }}
                  />
                  <span className="font-bold text-gray-900 dark:text-white truncate">
                    {item.course.name}
                  </span>
                  <span className="text-[11px] text-gray-400 font-mono">
                    ({item.attended}/{item.conducted} classes)
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono flex-shrink-0">
                  <span
                    className={`font-black text-xs sm:text-sm ${
                      isDanger
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {item.percentage.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-gray-400 font-sans font-medium">
                    {isDanger ? `Need ${item.mustAttend} classes` : `Safe to skip ${item.safeBunks}`}
                  </span>
                </div>
              </div>

              {/* Bar Container with Threshold Line */}
              <div className="relative w-full bg-gray-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
                {/* 75% threshold marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-900 dark:bg-white z-10 opacity-70"
                  style={{ left: `${courseThreshold}%` }}
                  title={`Target Cutoff: ${courseThreshold}%`}
                />

                {/* Actual attendance bar */}
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isDanger
                      ? 'bg-rose-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-gray-900 dark:bg-white inline-block rounded-full opacity-70" />
          Vertical indicator marks required {defaultThreshold}% institutional cutoff
        </span>
        <span>0% to 100% Scale</span>
      </div>
    </div>
  );
};
