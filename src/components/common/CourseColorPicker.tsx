import React, { useState, useEffect } from 'react';
import { Pipette, Check } from 'lucide-react';

export const COURSE_COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#0ea5e9', // Sky
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#10b981', // Emerald
  '#22c55e', // Green
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#f43f5e', // Rose
  '#ec4899', // Pink
  '#d946ef', // Fuchsia
  '#8b5cf6', // Violet
  '#64748b', // Slate
];

interface CourseColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export const CourseColorPicker: React.FC<CourseColorPickerProps> = ({
  value,
  onChange,
  label = 'Course Color',
}) => {
  const [hexInput, setHexInput] = useState(value);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  const handleHexChange = (inputVal: string) => {
    let clean = inputVal.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    setHexInput(clean);
    // Validate 6-digit hex (#rrggbb)
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      onChange(clean.toLowerCase());
    }
  };

  const handleNativePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value.toLowerCase();
    setHexInput(newColor);
    onChange(newColor);
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600 shadow-xs"
              style={{ backgroundColor: value }}
            />
            <span className="text-[11px] font-mono uppercase text-gray-500 dark:text-gray-400 font-bold">
              {value}
            </span>
          </div>
        </div>
      )}

      {/* Preset Swatches Grid */}
      <div className="flex items-center gap-2 flex-wrap">
        {COURSE_COLOR_PRESETS.map(preset => {
          const isSelected = value.toLowerCase() === preset.toLowerCase();
          return (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onChange(preset);
                setHexInput(preset);
              }}
              className={`w-7 h-7 rounded-xl transition-all flex items-center justify-center relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                isSelected
                  ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110 shadow-sm'
                  : 'hover:scale-105 opacity-90 hover:opacity-100'
              }`}
              style={{ backgroundColor: preset }}
              aria-label={`Select color ${preset}`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />}
            </button>
          );
        })}

        {/* Native OS Color Picker Button */}
        <label
          className="w-7 h-7 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 bg-gray-50 dark:bg-gray-800 flex items-center justify-center cursor-pointer transition-colors relative group"
          title="Pick custom color via system palette"
        >
          <Pipette className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300 group-hover:text-indigo-600 transition-colors" />
          <input
            type="color"
            value={value.startsWith('#') && value.length === 7 ? value : '#6366f1'}
            onChange={handleNativePicker}
            className="sr-only"
            aria-label="Pick custom color via system color picker"
          />
        </label>
      </div>

      {/* Hex Input & Live Custom Swatch */}
      <div className="flex items-center gap-2 pt-1">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-2.5 flex items-center text-xs font-mono text-gray-400">
            #
          </span>
          <input
            type="text"
            maxLength={7}
            value={hexInput.startsWith('#') ? hexInput.slice(1) : hexInput}
            onChange={e => handleHexChange(e.target.value)}
            placeholder="6366F1"
            className="w-full pl-6 pr-3 py-1.5 text-xs font-mono uppercase rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Live Swatch Button that also triggers native picker */}
        <label
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium text-gray-700 dark:text-gray-300"
          title="Click to open system color picker"
        >
          <span
            className="w-4 h-4 rounded-md shadow-xs border border-black/10"
            style={{ backgroundColor: value }}
          />
          <span className="text-[11px] font-semibold">Custom</span>
          <input
            type="color"
            value={value.startsWith('#') && value.length === 7 ? value : '#6366f1'}
            onChange={handleNativePicker}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
};

