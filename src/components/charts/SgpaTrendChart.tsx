import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface SgpaPoint {
  termName: string;
  termNumber: number;
  sgpa: number;
  cgpa: number;
}

interface SgpaTrendChartProps {
  data: SgpaPoint[];
  maxPoint?: number;
}

export const SgpaTrendChart: React.FC<SgpaTrendChartProps> = ({
  data,
  maxPoint = 10,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-gray-800">
        No semester grade data available yet to render trend.
      </div>
    );
  }

  const width = 500;
  const height = 220;
  const padding = { top: 25, right: 30, bottom: 40, left: 45 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minVal = 0;
  const maxVal = maxPoint;

  const getX = (index: number) => {
    if (data.length === 1) return padding.left + chartW / 2;
    return padding.left + (index / (data.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + chartH - ((clamped - minVal) / (maxVal - minVal)) * chartH;
  };

  // Build SVG path strings
  const sgpaPoints = data.map((d, i) => `${getX(i)},${getY(d.sgpa)}`).join(' ');
  const cgpaPoints = data.map((d, i) => `${getX(i)},${getY(d.cgpa)}`).join(' ');

  const gridSteps = [0, maxPoint * 0.25, maxPoint * 0.5, maxPoint * 0.75, maxPoint];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Academic Performance Trend (SGPA & CGPA)
          </h4>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            SGPA
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-600 border-dashed" />
            CGPA
          </span>
        </div>
      </div>

      <div className="w-full aspect-[25/11] max-h-64 relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {gridSteps.map(step => {
            const y = getY(step);
            return (
              <g key={step}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-gray-100 dark:text-gray-800"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-gray-400 font-mono"
                >
                  {step.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* CGPA dashed line */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeDasharray="5 4"
            points={cgpaPoints}
          />

          {/* SGPA solid line */}
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={sgpaPoints}
          />

          {/* Data Points */}
          {data.map((d, i) => {
            const x = getX(i);
            const ySgpa = getY(d.sgpa);
            const yCgpa = getY(d.cgpa);
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Vertical hover indicator */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={height - padding.bottom}
                    stroke="#818cf8"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* CGPA Point */}
                <circle
                  cx={x}
                  cy={yCgpa}
                  r={isHovered ? 5 : 3.5}
                  fill="#10b981"
                  className="transition-all"
                />

                {/* SGPA Point */}
                <circle
                  cx={x}
                  cy={ySgpa}
                  r={isHovered ? 6 : 4.5}
                  fill="#6366f1"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all"
                />

                {/* X Axis labels */}
                <text
                  x={x}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  className={`text-[10px] font-bold ${
                    isHovered
                      ? 'fill-indigo-600 dark:fill-indigo-400 font-black'
                      : 'fill-gray-500'
                  }`}
                >
                  {d.termName}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Box */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-3 py-1.5 rounded-xl shadow-lg text-xs pointer-events-none flex items-center gap-3 animate-fade-in"
          >
            <span className="font-bold">{data[hoveredIdx].termName}:</span>
            <span>SGPA: <strong className="text-indigo-400 dark:text-indigo-600">{data[hoveredIdx].sgpa.toFixed(2)}</strong></span>
            <span>CGPA: <strong className="text-emerald-400 dark:text-emerald-600">{data[hoveredIdx].cgpa.toFixed(2)}</strong></span>
          </div>
        )}
      </div>

      {/* Accessible data table for screen readers / tabular inspection */}
      <div className="overflow-x-auto pt-1">
        <table className="w-full text-xs text-left">
          <thead className="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="py-1">Semester</th>
              <th className="py-1">Term SGPA</th>
              <th className="py-1">Cumulative CGPA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40 font-mono">
            {data.map((d, i) => (
              <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                <td className="py-1 font-bold text-gray-900 dark:text-white font-sans">{d.termName}</td>
                <td className="py-1 text-indigo-600 dark:text-indigo-400 font-bold">{d.sgpa.toFixed(2)}</td>
                <td className="py-1 text-emerald-600 dark:text-emerald-400 font-bold">{d.cgpa.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
