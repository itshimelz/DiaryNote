import React, { useState, useMemo, useEffect } from 'react';
import { Note, CanvasTheme } from '../../types';
import { calculateJournalStreak, getLocalDateString, formatMonthYearHeader } from '../../utils';
import {
  Calendar03Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  FireIcon,
  BookOpen01Icon,
} from '@hugeicons/core-free-icons';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button, IconButton, Icon } from '../ui';

interface JournalCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectOrCreateDate: (dateStr: string) => void;
  themeMode?: CanvasTheme;
}

export const JournalCalendarModal: React.FC<JournalCalendarModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectOrCreateDate,
  themeMode: _themeMode,
}) => {
  // Current viewed month date state
  const [viewDate, setViewDate] = useState(() => new Date());

  useEffect(() => {
    if (isOpen) {
      setViewDate(new Date());
    }
  }, [isOpen]);

  // Journal streak and date calculations
  const streakStats = useMemo(() => {
    return calculateJournalStreak(notes);
  }, [notes]);

  const todayStr = useMemo(() => getLocalDateString(), []);

  // Generate calendar days matrix for viewDate
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDays = lastDayOfMonth.getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasEntry: boolean;
      note?: Note;
    }> = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      const dStr = getLocalDateString(prevDate);
      days.push({
        dateStr: dStr,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        hasEntry: streakStats.datesWithEntries.has(dStr),
      });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(year, month, day);
      const dStr = getLocalDateString(currentDate);
      const matchingNote = notes.find(
        (n) =>
          (Boolean(n.isDailyEntry) && n.entryDate === dStr) ||
          (n.entryDate === dStr && n.tags?.includes('journal'))
      );

      days.push({
        dateStr: dStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        hasEntry: streakStats.datesWithEntries.has(dStr),
        note: matchingNote,
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dStr = getLocalDateString(nextDate);
      days.push({
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        hasEntry: streakStats.datesWithEntries.has(dStr),
      });
    }

    return days;
  }, [viewDate, streakStats.datesWithEntries, notes, todayStr]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleTodayClick = () => {
    setViewDate(new Date());
  };

  const monthYearHeader = formatMonthYearHeader(viewDate);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg">
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <Icon icon={Calendar03Icon} size="md" />
            <span>Daily Journal Calendar</span>
          </span>
        }
        onClose={onClose}
      />

      <DialogBody className="space-y-4 text-xs pr-1">
        {/* Stats Row Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2.5">
            <div className="p-1.5 rounded-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <Icon icon={FireIcon} size="md" />
            </div>
            <div>
              <span className="text-[11px] block font-medium text-slate-600 dark:text-slate-400">
                Current Streak
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {streakStats.currentStreak} {streakStats.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2.5">
            <div className="p-1.5 rounded-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <Icon icon={BookOpen01Icon} size="md" />
            </div>
            <div>
              <span className="text-[11px] block font-medium text-slate-600 dark:text-slate-400">
                Total Entries
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {streakStats.totalEntries}
              </span>
            </div>
          </div>
        </div>

        {/* Month Navigation & Picker */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
              {monthYearHeader}
            </h3>
            <div className="flex items-center gap-1">
              <Button size="xs" variant="secondary" onClick={handleTodayClick}>
                Today
              </Button>
              <IconButton
                size="sm"
                variant="subtle"
                icon={ArrowLeft01Icon}
                aria-label="Previous Month"
                onClick={handlePrevMonth}
              />
              <IconButton
                size="sm"
                variant="subtle"
                icon={ArrowRight01Icon}
                aria-label="Next Month"
                onClick={handleNextMonth}
              />
            </div>
          </div>

          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-sans text-[10px]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="font-semibold py-0.5 text-slate-400 dark:text-slate-500">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 font-sans">
            {calendarDays.map((cell, idx) => {
              const isFuture = cell.dateStr > todayStr;

              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  type="button"
                  disabled={isFuture}
                  onClick={() => {
                    if (isFuture) return;
                    onSelectOrCreateDate(cell.dateStr);
                    onClose();
                  }}
                  title={isFuture ? 'Cannot create journal entries for future dates' : undefined}
                  className={`h-8 w-full rounded-sm text-xs flex flex-col items-center justify-center py-0.5 transition-colors cursor-pointer ${
                    isFuture
                      ? 'text-slate-400 dark:text-slate-600 opacity-30 cursor-not-allowed'
                      : !cell.isCurrentMonth
                      ? 'text-slate-400 dark:text-slate-600 opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                      : cell.isToday
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`leading-none ${cell.isToday ? 'font-bold' : 'font-medium'}`}>
                    {cell.dayNumber}
                  </span>
                  <span className="h-1 mt-0.5 flex items-center justify-center">
                    {cell.hasEntry && (
                      <span
                        className={`w-1 h-1 rounded-full shrink-0 ${
                          cell.isToday
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-900 dark:bg-white'
                        }`}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <div className="w-full flex items-center justify-between text-xs">
          <div className="flex items-center gap-3.5 text-[11px]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
              <span className="text-slate-600 dark:text-slate-400">Has Entry</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 dark:bg-white" />
              <span className="text-slate-600 dark:text-slate-400">Today</span>
            </span>
          </div>

          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
};
