import React, { lazy, Suspense } from 'react';

// Lazy-loaded chart modules
const SgpaTrendChartLazy = lazy(() =>
  import('./SgpaTrendChart').then(m => ({ default: m.SgpaTrendChart }))
);

const MarksBreakdownChartLazy = lazy(() =>
  import('./MarksBreakdownChart').then(m => ({ default: m.MarksBreakdownChart }))
);

const AttendanceThresholdChartLazy = lazy(() =>
  import('./AttendanceThresholdChart').then(m => ({ default: m.AttendanceThresholdChart }))
);

const ChartSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse space-y-4">
    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/3" />
    <div className="h-40 bg-gray-100 dark:bg-gray-800/60 rounded-2xl w-full" />
  </div>
);

export const LazySgpaTrendChart: React.FC<React.ComponentProps<typeof SgpaTrendChartLazy>> = props => (
  <Suspense fallback={<ChartSkeleton />}>
    <SgpaTrendChartLazy {...props} />
  </Suspense>
);

export const LazyMarksBreakdownChart: React.FC<React.ComponentProps<typeof MarksBreakdownChartLazy>> = props => (
  <Suspense fallback={<ChartSkeleton />}>
    <MarksBreakdownChartLazy {...props} />
  </Suspense>
);

export const LazyAttendanceThresholdChart: React.FC<React.ComponentProps<typeof AttendanceThresholdChartLazy>> = props => (
  <Suspense fallback={<ChartSkeleton />}>
    <AttendanceThresholdChartLazy {...props} />
  </Suspense>
);
