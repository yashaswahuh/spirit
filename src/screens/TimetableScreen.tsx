import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Clock,
  Plus,
  Copy,
  Pencil,
  Trash2,
  Calendar,
  History,
  AlertTriangle,
  Sliders,
  Sparkles,
  Clipboard,
  CalendarDays,
  Layers,
  UploadCloud,
} from 'lucide-react';
import { db } from '../db/dexie';
import { Weekday, Course, TimetableSlot } from '../types';
import { PageContainer } from '../components/layout/PageContainer';
import { detectSlotOverlaps } from '../../src/engine/timetable';
import {
  createTimetableSlot,
  updateTimetableSlot,
  duplicateTimetableSlot,
  deleteTimetableSlot,
  duplicateTimetableVersionWithSlots,
  createTimetableOverride,
  deleteTimetableOverride,
} from '../db/repositories/timetable.repo';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  bulkCreateHolidays,
} from '../db/repositories/calendar.repo';
import { updateTermSettings } from '../db/repositories/term.repo';
import { updateCourse } from '../db/repositories/course.repo';
import { SlotModal } from '../components/timetable/SlotModal';
import { VersionModal } from '../components/timetable/VersionModal';
import { OneOffOverrideModal } from '../components/timetable/OneOffOverrideModal';
import { CalendarEventModal } from '../components/timetable/CalendarEventModal';
import { PasteHolidaysModal } from '../components/timetable/PasteHolidaysModal';
import { TermSettingsModal } from '../components/timetable/TermSettingsModal';
import { TimetableUploadModal } from '../components/timetable/TimetableUploadModal';
import { SemesterSwitcherModal } from '../components/timetable/SemesterSwitcherModal';

const ALL_DAYS: { day: Weekday; label: string; full: string }[] = [
  { day: 1, label: 'Mon', full: 'Monday' },
  { day: 2, label: 'Tue', full: 'Tuesday' },
  { day: 3, label: 'Wed', full: 'Wednesday' },
  { day: 4, label: 'Thu', full: 'Thursday' },
  { day: 5, label: 'Fri', full: 'Friday' },
  { day: 6, label: 'Sat', full: 'Saturday' },
  { day: 0, label: 'Sun', full: 'Sunday' },
];

export const TimetableScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'overrides' | 'calendar'>('schedule');

  // Queries
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const slots = useLiveQuery(() => db.timetable_slot.filter(s => s.deleted_at === null).toArray()) || [];
  const versions = useLiveQuery(() => db.timetable_version.filter(v => v.deleted_at === null).toArray()) || [];
  const overrides = useLiveQuery(() => db.timetable_override.filter(o => o.deleted_at === null).toArray()) || [];
  const calendarEvents = useLiveQuery(() => db.calendar_event.filter(e => e.deleted_at === null).toArray()) || [];
  const term = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());

  // Active timetable version selection
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const activeVersion = versions.find(v => (selectedVersionId ? v.id === selectedVersionId : true)) || versions[0];
  const effectiveVersionId = activeVersion?.id || null;

  // Selected weekday
  const currentWeekday = new Date().getDay() as Weekday;
  const initialDay = currentWeekday === 0 || currentWeekday === 6 ? 1 : currentWeekday;
  const [selectedDay, setSelectedDay] = useState<Weekday>(initialDay);

  // Selected date for one-off changes
  const [overrideDate, setOverrideDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Modals state
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);

  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));

  // Slots for the current active version & selected day
  const versionSlots = slots.filter(s => !effectiveVersionId || !s.version_id || s.version_id === effectiveVersionId);
  const daySlots = versionSlots
    .filter(s => s.weekday === selectedDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Overlap detection on current day
  const dayOverlaps = detectSlotOverlaps(daySlots);

  // Handlers for slot actions
  const handleOpenAddSlot = () => {
    setEditingSlot(null);
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setIsSlotModalOpen(true);
  };

  const handleDuplicateSlot = async (slot: TimetableSlot) => {
    await duplicateTimetableSlot(slot.id);
  };

  const handleDeleteSlot = async (id: string) => {
    await deleteTimetableSlot(id);
    setIsSlotModalOpen(false);
  };

  const handleSaveSlot = async (data: Omit<TimetableSlot, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
    if (editingSlot) {
      await updateTimetableSlot(editingSlot.id, data);
    } else {
      await createTimetableSlot({
        ...data,
        version_id: effectiveVersionId,
      });
    }
  };

  const workingDays = term?.working_days || [1, 2, 3, 4, 5, 6];
  const visibleDays = ALL_DAYS.filter(d => workingDays.includes(d.day) || d.day === selectedDay);

  return (
    <PageContainer maxWidth="xl" className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            Timetable & Schedule
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Weekly grid, timetable versions, one-off class changes, and calendar
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors min-h-[44px]"
            title="Upload or paste timetable file to auto-recognize subjects"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Upload Timetable
          </button>

          <button
            type="button"
            onClick={() => setIsSemesterModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
            title="Switch semester or edit dates"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            {term?.name || 'Semesters'}
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
            Term & Timings
          </button>

          <button
            type="button"
            onClick={handleOpenAddSlot}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 dark:shadow-none transition-all min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Slot
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-2xl w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'schedule'
              ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Weekly Grid
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overrides')}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'overrides'
              ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          One-Off Changes
          {overrides.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-[10px] flex items-center justify-center font-bold">
              {overrides.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'calendar'
              ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Holidays & Swap Days
          {calendarEvents.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 text-[10px] flex items-center justify-center font-bold">
              {calendarEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WEEKLY SCHEDULE */}
      {/* ========================================================================= */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Version Banner & Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  Schedule Version: <span className="text-indigo-600 dark:text-indigo-400">{activeVersion?.name || 'Default Timetable'}</span>
                </p>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                  Effective from {activeVersion?.effective_from || term?.start_date || 'Start of Term'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsVersionModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-colors min-h-[44px]"
            >
              <History className="w-3.5 h-3.5 text-indigo-500" />
              Manage Versions ({versions.length})
            </button>
          </div>

          {/* Weekday Switcher Bar */}
          <div className="flex gap-1.5 sm:gap-2 bg-white dark:bg-gray-900 p-1.5 sm:p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto">
            {visibleDays.map(d => {
              const isSelected = selectedDay === d.day;
              const count = versionSlots.filter(s => s.weekday === d.day).length;
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setSelectedDay(d.day)}
                  className={`flex-1 py-2 sm:py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[44px] flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="sm:hidden">{d.label}</span>
                  <span className="hidden sm:inline">{d.full}</span>
                  <span className={`text-[10px] font-normal ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                    {count} {count === 1 ? 'class' : 'classes'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Overlap Warning Banner */}
          {dayOverlaps.length > 0 && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Parallel / Overlapping Slots Detected</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {dayOverlaps.map(o => o.message).join('; ')}. Allowed for elective batches and lab sections.
                </p>
              </div>
            </div>
          )}

          {/* Slots List in Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {daySlots.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 space-y-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  No recurring classes scheduled for {ALL_DAYS.find(d => d.day === selectedDay)?.full}.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddSlot}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl transition-colors min-h-[44px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Class for this Day
                </button>
              </div>
            ) : (
              daySlots.map(slot => {
                const course = courseMap.get(slot.course_id);
                if (!course) return null;

                const weight = slot.weight || 1;

                return (
                  <div
                    key={slot.id}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between gap-3 hover:border-gray-200 dark:hover:border-gray-700 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className="w-2.5 h-10 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: course.color || '#6366f1' }}
                        />
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                            {course.name}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                              {course.code || 'NO-CODE'}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                              {slot.component_type}
                            </span>
                            {weight > 1 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                {weight} periods
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 font-mono whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          {slot.start_time} - {slot.end_time}
                        </span>
                        {slot.room && (
                          <span className="block text-[11px] text-gray-400 font-mono mt-0.5">
                            {slot.room}
                          </span>
                        )}
                        {slot.faculty && (
                          <span className="block text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                            {slot.faculty}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Slot Card Actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-50 dark:border-gray-800/80">
                      <button
                        type="button"
                        onClick={() => handleDuplicateSlot(slot)}
                        title="Duplicate Slot"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditSlot(slot)}
                        title="Edit Slot"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(slot.id)}
                        title="Delete Slot"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ONE-OFF DATE CHANGES */}
      {/* ========================================================================= */}
      {activeTab === 'overrides' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                One-Off Changes by Date
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cancel a class, substitute a subject, or add extra lectures for a specific date without touching the recurring weekly schedule.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={overrideDate}
                onChange={e => setOverrideDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono font-bold text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors min-h-[44px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Date Change
              </button>
            </div>
          </div>

          {/* List of active date overrides */}
          <div className="space-y-3">
            {overrides.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 text-sm text-gray-500">
                No single-day class overrides scheduled.
              </div>
            ) : (
              overrides.map(ov => {
                const course = courseMap.get(ov.course_id);
                return (
                  <div
                    key={ov.id}
                    className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-2.5 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: course?.color || '#6366f1' }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                              ov.action === 'cancel'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700'
                                : ov.action === 'substitute'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700'
                                : ov.action === 'extra'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700'
                                : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700'
                            }`}
                          >
                            {ov.action}
                          </span>
                          <span className="text-xs font-mono text-gray-400 font-bold">{ov.date}</span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1 truncate">
                          {course?.name || 'Class'} ({ov.start_time} - {ov.end_time})
                        </h4>
                        {ov.note && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {ov.note}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteTimetableOverride(ov.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Remove override"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HOLIDAYS & CALENDAR */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Semester Holidays & Academic Calendar
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Holidays automatically exclude classes from conducted count. Swap days let you follow another weekday schedule.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                <Clipboard className="w-3.5 h-3.5 text-indigo-500" />
                Paste List
              </button>

              <button
                type="button"
                onClick={() => setIsEventModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors min-h-[44px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Event
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {calendarEvents.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 text-sm text-gray-500">
                No holidays or calendar events defined. Use &ldquo;Add Event&rdquo; or &ldquo;Paste List&rdquo; to add college holidays.
              </div>
            ) : (
              calendarEvents.map(ev => (
                <div
                  key={ev.id}
                  className="p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        ev.type === 'holiday'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
                          : ev.type === 'swap_day'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600'
                          : ev.type === 'exam'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                          {ev.date} {ev.end_date ? `to ${ev.end_date}` : ''}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md ${
                            ev.type === 'holiday'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700'
                              : ev.type === 'swap_day'
                              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700'
                          }`}
                        >
                          {ev.type}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                        {ev.note || 'Event'}
                      </p>
                      {ev.type === 'swap_day' && ev.swap_target_weekday !== null && (
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          Follows {ALL_DAYS.find(d => d.day === ev.swap_target_weekday)?.full} Timetable
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteCalendarEvent(ev.id)}
                    className="p-2 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Add / Edit Slot Modal */}
      <SlotModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        onSave={handleSaveSlot}
        onDelete={handleDeleteSlot}
        slot={editingSlot}
        defaultWeekday={selectedDay}
        versionId={effectiveVersionId}
        courses={courses}
        existingSlots={versionSlots}
        periodTimings={term?.period_timings}
        workingDays={workingDays}
      />

      {/* 2. Timetable Versions Modal */}
      <VersionModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        versions={versions}
        currentVersionId={effectiveVersionId}
        onSelectVersion={id => {
          setSelectedVersionId(id);
          setIsVersionModalOpen(false);
        }}
        onCreateVersion={async (name, effectiveFrom) => {
          if (term) {
            const newVersion = await duplicateTimetableVersionWithSlots(
              effectiveVersionId,
              term.id,
              name,
              effectiveFrom
            );
            setSelectedVersionId(newVersion.id);
          }
        }}
      />

      {/* 3. One-Off Override Modal */}
      <OneOffOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        date={overrideDate}
        daySlots={daySlots.map(s => ({
          slot_id: s.id,
          course_id: s.course_id,
          start_time: s.start_time,
          end_time: s.end_time,
          room: s.room,
          faculty: s.faculty || null,
          component_type: s.component_type,
          weight: s.weight || 1,
          period_name: s.period_name || null,
          is_override: false,
        }))}
        courses={courses}
        termId={term?.id || ''}
        periodTimings={term?.period_timings}
        onSaveOverride={async data => {
          await createTimetableOverride(data);
        }}
      />

      {/* 4. Calendar Event / Holiday Modal */}
      <CalendarEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={async data => {
          await createCalendarEvent(data);
        }}
      />

      {/* 5. Paste Holidays Modal */}
      <PasteHolidaysModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onSaveHolidays={async holidays => {
          await bulkCreateHolidays(holidays);
        }}
      />

      {/* 6. Term & Timings Settings Modal */}
      {term && (
        <TermSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          term={term}
          courses={courses}
          onSaveTerm={async updates => {
            await updateTermSettings(term.id, updates);
          }}
          onUpdateCourseThreshold={async (courseId, thresh) => {
            await updateCourse(courseId, { attendance_threshold_override: thresh });
          }}
        />
      )}

      {/* 7. Upload Timetable Modal */}
      <TimetableUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        activeTerm={term}
        existingCourses={courses}
        activeVersion={activeVersion}
      />

      {/* 8. Semester Switcher Modal */}
      <SemesterSwitcherModal
        isOpen={isSemesterModalOpen}
        onClose={() => setIsSemesterModalOpen(false)}
      />
    </PageContainer>
  );
};
