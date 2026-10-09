import { useState, useEffect } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type AccentPreference = 'indigo' | 'emerald' | 'violet' | 'rose' | 'amber' | 'cyan';
export type WeekStartDay = 1 | 0; // 1 = Monday, 0 = Sunday
export type TimeFormat = '12h' | '24h';
export type DateFormatPattern = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
export type LabAttendanceRule = 'per_hour' | 'single_session';

export interface PeriodTimingConfig {
  period: number;
  name: string;
  startTime: string;
  endTime: string;
}

export const DEFAULT_PERIOD_TIMINGS: PeriodTimingConfig[] = [
  { period: 1, name: 'Period 1', startTime: '09:00', endTime: '09:55' },
  { period: 2, name: 'Period 2', startTime: '10:00', endTime: '10:55' },
  { period: 3, name: 'Period 3', startTime: '11:15', endTime: '12:10' },
  { period: 4, name: 'Period 4', startTime: '12:15', endTime: '13:10' },
  { period: 5, name: 'Period 5', startTime: '14:00', endTime: '14:55' },
  { period: 6, name: 'Period 6', startTime: '15:00', endTime: '15:55' },
  { period: 7, name: 'Period 7', startTime: '16:00', endTime: '16:55' },
];

export const ACCENT_COLORS: Record<AccentPreference, { name: string; hex: string; class: string }> = {
  indigo: { name: 'Indigo', hex: '#4f46e5', class: 'bg-indigo-600' },
  emerald: { name: 'Emerald', hex: '#059669', class: 'bg-emerald-600' },
  violet: { name: 'Violet', hex: '#7c3aed', class: 'bg-violet-600' },
  rose: { name: 'Rose', hex: '#e11d48', class: 'bg-rose-600' },
  amber: { name: 'Amber', hex: '#d97706', class: 'bg-amber-600' },
  cyan: { name: 'Cyan', hex: '#0891b2', class: 'bg-cyan-600' },
};

const getStorageItem = (key: string): string | null => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // In restricted or SSR/Node environments
  }
  return null;
};

const setStorageItem = (key: string, value: string): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // In restricted or SSR/Node environments
  }
};

export const getThemePreference = (): ThemePreference => {
  return (getStorageItem('spirit_theme_pref') as ThemePreference) || 'system';
};

export const setThemePreference = (pref: ThemePreference): void => {
  setStorageItem('spirit_theme_pref', pref);
  applyTheme(pref);
};

export const getEffectiveThemeIsDark = (pref: ThemePreference = getThemePreference()): boolean => {
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const applyTheme = (pref: ThemePreference = getThemePreference()): boolean => {
  const isDark = getEffectiveThemeIsDark(pref);
  if (typeof document !== 'undefined') {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  return isDark;
};

export const getAccentPreference = (): AccentPreference => {
  return (getStorageItem('spirit_accent_pref') as AccentPreference) || 'indigo';
};

export const applyAccent = (accent: AccentPreference = getAccentPreference()): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.accent = accent;
  }
};

export const setAccentPreference = (accent: AccentPreference): void => {
  setStorageItem('spirit_accent_pref', accent);
  applyAccent(accent);
};

export const getWeekStartDay = (): WeekStartDay => {
  const stored = getStorageItem('spirit_week_start');
  return stored === '0' ? 0 : 1;
};

export const setWeekStartDay = (day: WeekStartDay): void => {
  setStorageItem('spirit_week_start', day.toString());
};

export const getTimeFormat = (): TimeFormat => {
  return (getStorageItem('spirit_time_format') as TimeFormat) || '12h';
};

export const setTimeFormat = (format: TimeFormat): void => {
  setStorageItem('spirit_time_format', format);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spirit_time_format_changed', { detail: format }));
  }
};

export const getDateFormat = (): DateFormatPattern => {
  return (getStorageItem('spirit_date_format') as DateFormatPattern) || 'DD/MM/YYYY';
};

export const setDateFormat = (format: DateFormatPattern): void => {
  setStorageItem('spirit_date_format', format);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('spirit_date_format_changed', { detail: format }));
  }
};

/**
 * React hook that returns the active DateFormatPattern and dynamically re-renders
 * whenever the user updates their date format preference in Settings.
 */
export const useDateFormat = (): DateFormatPattern => {
  const [format, setFormat] = useState<DateFormatPattern>(getDateFormat);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<DateFormatPattern>;
      if (ce.detail) {
        setFormat(ce.detail);
      } else {
        setFormat(getDateFormat());
      }
    };
    window.addEventListener('spirit_date_format_changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('spirit_date_format_changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return format;
};

/**
 * React hook that returns the active TimeFormat and dynamically re-renders
 * whenever the user updates their time format preference in Settings.
 */
export const useTimeFormat = (): TimeFormat => {
  const [format, setFormat] = useState<TimeFormat>(getTimeFormat);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<TimeFormat>;
      if (ce.detail) {
        setFormat(ce.detail);
      } else {
        setFormat(getTimeFormat());
      }
    };
    window.addEventListener('spirit_time_format_changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('spirit_time_format_changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return format;
};

export interface FormatDateOptions {
  includeWeekday?: boolean;
}

/**
 * Format any date (ISO string, Date object, or timestamp) according to the user's
 * preferred date format pattern (DD/MM/YYYY, YYYY-MM-DD, or MM/DD/YYYY).
 */
export const formatDate = (
  date: string | Date | number | null | undefined,
  pattern?: DateFormatPattern,
  options?: FormatDateOptions
): string => {
  if (!date && date !== 0) return '';
  const activePattern = pattern || getDateFormat();

  // If input is an ISO date string like "2026-10-09" or starts with "YYYY-MM-DD"
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    const y = date.slice(0, 4);
    const m = date.slice(5, 7);
    const d = date.slice(8, 10);

    let formatted = '';
    if (activePattern === 'YYYY-MM-DD') {
      formatted = `${y}-${m}-${d}`;
    } else if (activePattern === 'MM/DD/YYYY') {
      formatted = `${m}/${d}/${y}`;
    } else {
      formatted = `${d}/${m}/${y}`;
    }

    if (options?.includeWeekday) {
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
      formatted = `${weekday}, ${formatted}`;
    }

    return formatted;
  }

  // Fallback for Date instances, numeric timestamps, or other date strings
  const dateObj = typeof date === 'number' ? new Date(date) : date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return typeof date === 'string' ? date : '';

  const y = dateObj.getFullYear().toString();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');

  let formatted = '';
  if (activePattern === 'YYYY-MM-DD') {
    formatted = `${y}-${m}-${d}`;
  } else if (activePattern === 'MM/DD/YYYY') {
    formatted = `${m}/${d}/${y}`;
  } else {
    formatted = `${d}/${m}/${y}`;
  }

  if (options?.includeWeekday) {
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
    formatted = `${weekday}, ${formatted}`;
  }

  return formatted;
};

/**
 * Format a time string (HH:mm) or Date/timestamp into 12h or 24h format.
 */
export const formatTime = (
  dateOrTime: string | Date | number | null | undefined,
  timeFormat?: TimeFormat
): string => {
  if (!dateOrTime && dateOrTime !== 0) return '';
  const activeFormat = timeFormat || getTimeFormat();

  if (typeof dateOrTime === 'string' && /^\d{1,2}:\d{2}/.test(dateOrTime)) {
    const [hStr, mStr] = dateOrTime.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr.slice(0, 2);
    if (activeFormat === '24h') {
      return `${String(h).padStart(2, '0')}:${m}`;
    }
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  const d = typeof dateOrTime === 'number' ? new Date(dateOrTime) : dateOrTime instanceof Date ? dateOrTime : new Date(dateOrTime);
  if (isNaN(d.getTime())) return '';

  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  if (activeFormat === '24h') {
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

/**
 * Format both date and time into a single localized string.
 */
export const formatDateTime = (
  date: string | Date | number | null | undefined,
  datePattern?: DateFormatPattern,
  timeFormat?: TimeFormat
): string => {
  if (!date && date !== 0) return '';
  const dStr = formatDate(date, datePattern);
  const tStr = formatTime(date, timeFormat);
  if (!dStr) return '';
  if (!tStr) return dStr;
  return `${dStr} ${tStr}`;
};

export const getPeriodTimings = (): PeriodTimingConfig[] => {
  try {
    const raw = getStorageItem('spirit_period_timings');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse period timings', e);
  }
  return DEFAULT_PERIOD_TIMINGS;
};

export const setPeriodTimings = (timings: PeriodTimingConfig[]): void => {
  setStorageItem('spirit_period_timings', JSON.stringify(timings));
};

export const getLabAttendanceRule = (): LabAttendanceRule => {
  return (getStorageItem('spirit_lab_attendance_rule') as LabAttendanceRule) || 'per_hour';
};

export const setLabAttendanceRule = (rule: LabAttendanceRule): void => {
  setStorageItem('spirit_lab_attendance_rule', rule);
};

