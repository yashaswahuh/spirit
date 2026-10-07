export type ThemePreference = 'light' | 'dark' | 'system';
export type AccentPreference = 'indigo' | 'emerald' | 'violet' | 'rose' | 'amber' | 'cyan';
export type WeekStartDay = 1 | 0; // 1 = Monday, 0 = Sunday
export type TimeFormat = '12h' | '24h';
export type DateFormatPattern = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';

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

export const getThemePreference = (): ThemePreference => {
  return (localStorage.getItem('spirit_theme_pref') as ThemePreference) || 'system';
};

export const setThemePreference = (pref: ThemePreference): void => {
  localStorage.setItem('spirit_theme_pref', pref);
  applyTheme(pref);
};

export const getEffectiveThemeIsDark = (pref: ThemePreference = getThemePreference()): boolean => {
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const applyTheme = (pref: ThemePreference = getThemePreference()): boolean => {
  const isDark = getEffectiveThemeIsDark(pref);
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  return isDark;
};

export const getAccentPreference = (): AccentPreference => {
  return (localStorage.getItem('spirit_accent_pref') as AccentPreference) || 'indigo';
};

export const setAccentPreference = (accent: AccentPreference): void => {
  localStorage.setItem('spirit_accent_pref', accent);
  document.documentElement.dataset.accent = accent;
};

export const getWeekStartDay = (): WeekStartDay => {
  const stored = localStorage.getItem('spirit_week_start');
  return stored === '0' ? 0 : 1;
};

export const setWeekStartDay = (day: WeekStartDay): void => {
  localStorage.setItem('spirit_week_start', day.toString());
};

export const getTimeFormat = (): TimeFormat => {
  return (localStorage.getItem('spirit_time_format') as TimeFormat) || '12h';
};

export const setTimeFormat = (format: TimeFormat): void => {
  localStorage.setItem('spirit_time_format', format);
};

export const getDateFormat = (): DateFormatPattern => {
  return (localStorage.getItem('spirit_date_format') as DateFormatPattern) || 'DD/MM/YYYY';
};

export const setDateFormat = (format: DateFormatPattern): void => {
  localStorage.setItem('spirit_date_format', format);
};

export const getPeriodTimings = (): PeriodTimingConfig[] => {
  try {
    const raw = localStorage.getItem('spirit_period_timings');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse period timings', e);
  }
  return DEFAULT_PERIOD_TIMINGS;
};

export const setPeriodTimings = (timings: PeriodTimingConfig[]): void => {
  localStorage.setItem('spirit_period_timings', JSON.stringify(timings));
};
