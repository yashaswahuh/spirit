import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Clock } from 'lucide-react';
import { db } from '../db/dexie';
import { Weekday, Course } from '../types';
import { PageContainer } from '../components/layout/PageContainer';

const DAYS = [
  { day: 1 as Weekday, label: 'Mon', full: 'Monday' },
  { day: 2 as Weekday, label: 'Tue', full: 'Tuesday' },
  { day: 3 as Weekday, label: 'Wed', full: 'Wednesday' },
  { day: 4 as Weekday, label: 'Thu', full: 'Thursday' },
  { day: 5 as Weekday, label: 'Fri', full: 'Friday' },
  { day: 6 as Weekday, label: 'Sat', full: 'Saturday' },
];

export const TimetableScreen: React.FC = () => {
  const currentWeekday = new Date().getDay() as Weekday;
  const initialDay = currentWeekday === 0 || currentWeekday === 6 ? 1 : currentWeekday;
  const [selectedDay, setSelectedDay] = useState<Weekday>(initialDay);

  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const slots = useLiveQuery(() => db.timetable_slot.filter(s => s.deleted_at === null).toArray()) || [];

  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));
  const daySlots = slots
    .filter(s => s.weekday === selectedDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <PageContainer maxWidth="xl" className="space-y-6 animate-fade-in">
      <div className="pb-2 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Class Timetable
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Weekly schedule and period timings
        </p>
      </div>

      {/* Weekday Switcher Bar */}
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2 bg-white dark:bg-gray-900 p-1.5 sm:p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        {DAYS.map(d => {
          const isSelected = selectedDay === d.day;
          return (
            <button
              key={d.day}
              onClick={() => setSelectedDay(d.day)}
              className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none min-h-[44px] ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="sm:hidden">{d.label}</span>
              <span className="hidden sm:inline">{d.full}</span>
            </button>
          );
        })}
      </div>

      {/* Slots List in Responsive Grid on Tablet / Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {daySlots.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No classes scheduled for {DAYS.find(d => d.day === selectedDay)?.full}.
            </p>
          </div>
        ) : (
          daySlots.map(slot => {
            const course = courseMap.get(slot.course_id);
            if (!course) return null;

            return (
              <div
                key={slot.id}
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-3 hover:border-gray-200 dark:hover:border-gray-700 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-2.5 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: course.color || '#6366f1' }}
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                      {course.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {course.code || 'NO-CODE'} • {slot.component_type}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 font-mono whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    {slot.start_time} - {slot.end_time}
                  </span>
                  {slot.room && (
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                      Room {slot.room}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </PageContainer>
  );
};
