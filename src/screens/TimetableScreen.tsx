import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Clock } from 'lucide-react';
import { db } from '../db/dexie';
import { Weekday, Course } from '../types';

const DAYS = [
  { day: 1 as Weekday, label: 'Mon' },
  { day: 2 as Weekday, label: 'Tue' },
  { day: 3 as Weekday, label: 'Wed' },
  { day: 4 as Weekday, label: 'Thu' },
  { day: 5 as Weekday, label: 'Fri' },
  { day: 6 as Weekday, label: 'Sat' },
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
    <div className="p-4 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Class Timetable
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Weekly schedule and period timings
        </p>
      </div>

      {/* Weekday Switcher Bar */}
      <div className="grid grid-cols-6 gap-1 bg-white dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
        {DAYS.map(d => {
          const isSelected = selectedDay === d.day;
          return (
            <button
              key={d.day}
              onClick={() => setSelectedDay(d.day)}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Slots List */}
      <div className="space-y-2.5">
        {daySlots.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No classes scheduled for this day.
            </p>
          </div>
        ) : (
          daySlots.map(slot => {
            const course = courseMap.get(slot.course_id);
            if (!course) return null;

            return (
              <div
                key={slot.id}
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2.5 h-10 rounded-full"
                    style={{ backgroundColor: course.color || '#6366f1' }}
                  />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {course.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {course.code || 'NO-CODE'} • {slot.component_type}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300 font-mono">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    {slot.start_time} - {slot.end_time}
                  </span>
                  {slot.room && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Room {slot.room}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
