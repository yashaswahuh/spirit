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
