// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAccentPreference,
  setAccentPreference,
  applyAccent,
  getThemePreference,
  setThemePreference,
  applyTheme,
  getTimeFormat,
  setTimeFormat,
  getDateFormat,
  setDateFormat,
  formatDate,
  formatTime,
  formatDateTime,
  getWeekStartDay,
  setWeekStartDay,
  getPeriodTimings,
  setPeriodTimings,
  DEFAULT_PERIOD_TIMINGS,
} from '../preferences';
import { COURSE_COLOR_PRESETS } from '../../components/common/CourseColorPicker';

describe('User Preferences & Accent Customization', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.accent;
    document.documentElement.className = '';
  });

  it('defaults accent preference to indigo and applies dataset attribute', () => {
    expect(getAccentPreference()).toBe('indigo');
    applyAccent('indigo');
    expect(document.documentElement.dataset.accent).toBe('indigo');
  });

  it('updates accent preference and synchronizes DOM dataset.accent', () => {
    setAccentPreference('emerald');
    expect(localStorage.getItem('spirit_accent_pref')).toBe('emerald');
    expect(document.documentElement.dataset.accent).toBe('emerald');

    setAccentPreference('rose');
    expect(localStorage.getItem('spirit_accent_pref')).toBe('rose');
    expect(document.documentElement.dataset.accent).toBe('rose');

    setAccentPreference('cyan');
    expect(document.documentElement.dataset.accent).toBe('cyan');
  });

  it('applies dark and light theme classes correctly', () => {
    expect(getThemePreference()).toBe('system');
    setThemePreference('dark');
    expect(getThemePreference()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    setThemePreference('light');
    expect(getThemePreference()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('manages time format and date format preferences', () => {
    expect(getTimeFormat()).toBe('12h');
    setTimeFormat('24h');
    expect(getTimeFormat()).toBe('24h');

    expect(getDateFormat()).toBe('DD/MM/YYYY');
    setDateFormat('YYYY-MM-DD');
    expect(getDateFormat()).toBe('YYYY-MM-DD');
  });

  it('formats dates accurately according to selected date pattern', () => {
    // Test with ISO date string '2026-10-09'
    setDateFormat('DD/MM/YYYY');
    expect(formatDate('2026-10-09')).toBe('09/10/2026');

    setDateFormat('YYYY-MM-DD');
    expect(formatDate('2026-10-09')).toBe('2026-10-09');

    setDateFormat('MM/DD/YYYY');
    expect(formatDate('2026-10-09')).toBe('10/09/2026');

    // Overriding pattern explicitly
    expect(formatDate('2026-10-09', 'DD/MM/YYYY')).toBe('09/10/2026');
    expect(formatDate('2026-10-09', 'MM/DD/YYYY')).toBe('10/09/2026');

    // With weekday option
    expect(formatDate('2026-10-09', 'DD/MM/YYYY', { includeWeekday: true })).toBe('Fri, 09/10/2026');
    expect(formatDate('2026-10-09', 'YYYY-MM-DD', { includeWeekday: true })).toBe('Fri, 2026-10-09');

    // Handling null, undefined, empty
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');

    // Handling Date object
    const d = new Date(2026, 9, 9); // Month 9 is October in local time
    expect(formatDate(d, 'DD/MM/YYYY')).toBe('09/10/2026');
    expect(formatDate(d, 'YYYY-MM-DD')).toBe('2026-10-09');
  });

  it('formats time and datetime according to time and date preferences', () => {
    setTimeFormat('12h');
    expect(formatTime('14:30')).toBe('2:30 PM');
    expect(formatTime('09:15')).toBe('9:15 AM');

    setTimeFormat('24h');
    expect(formatTime('14:30')).toBe('14:30');
    expect(formatTime('09:15')).toBe('09:15');

    // formatDateTime
    setDateFormat('DD/MM/YYYY');
    setTimeFormat('12h');
    expect(formatDateTime('2026-10-09T14:30:00')).toBe('09/10/2026 2:30 PM');
  });

  it('manages week start day', () => {
    expect(getWeekStartDay()).toBe(1); // Monday default
    setWeekStartDay(0); // Sunday
    expect(getWeekStartDay()).toBe(0);
  });

  it('loads and stores custom period timings', () => {
    expect(getPeriodTimings()).toEqual(DEFAULT_PERIOD_TIMINGS);

    const custom = [
      { period: 1, name: 'Morning Lecture', startTime: '08:30', endTime: '09:30' },
      { period: 2, name: 'Break', startTime: '09:30', endTime: '10:00' },
    ];
    setPeriodTimings(custom);
    expect(getPeriodTimings()).toEqual(custom);
  });

  it('provides a comprehensive course color palette with valid hex codes', () => {
    expect(COURSE_COLOR_PRESETS.length).toBeGreaterThanOrEqual(16);
    for (const hex of COURSE_COLOR_PRESETS) {
      expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
