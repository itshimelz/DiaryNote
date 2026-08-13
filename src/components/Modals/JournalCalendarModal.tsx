import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Note, CanvasTheme } from '../../types';
import { calculateJournalStreak, getLocalDateString } from '../../utils';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Flame, X, BookOpen } from 'lucide-react';

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
  themeMode = 'dark',
}) => {
  const isDark = themeMode !== 'light';

  // Current viewed month date state
  const [viewDate, setViewDate] = useState(() => new Date());

  useEffect(() => {
    if (isOpen) {
      setViewDate(new Date());
    }
  }, [isOpen]);

  // Handle keydown for ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      const matchingNote = notes.find((n) => (Boolean(n.isDailyEntry) && n.entryDate === dStr) || (n.entryDate === dStr && n.tags?.includes('journal')));

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

  const monthYearHeader = viewDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 animate-in fade-in select-none font-sans ${
        isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-slate-950/40 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-md shadow-sm border p-5 overflow-hidden flex flex-col transition-opacity duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between pb-3 mb-3.5 border-b transition-colors ${
            isDark ? 'border-slate-800' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
            <h2 className="font-bold text-sm tracking-tight leading-none">Daily Journal Calendar</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Row Cards */}
        <div className="grid grid-cols-2 gap-2 mb-3.5">
          <div
            className={`p-2.5 rounded-sm border flex items-center gap-2.5 transition-colors ${
              isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
            }`}
          >
            <div className={`p-1.5 rounded-sm ${isDark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-white text-slate-800 border border-slate-200'}`}>
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className={`text-[11px] block font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Current Streak
              </span>
              <span className="text-xs font-bold">
                {streakStats.currentStreak} {streakStats.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-sm border flex items-center gap-2.5 transition-colors ${
              isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200/90'
            }`}
          >
            <div className={`p-1.5 rounded-sm ${isDark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-white text-slate-800 border border-slate-200'}`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className={`text-[11px] block font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Total Entries
              </span>
              <span className="text-xs font-bold">
                {streakStats.totalEntries}
              </span>
            </div>
          </div>
        </div>

        {/* Month Navigation & Picker */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between px-1">
            <h3 className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {monthYearHeader}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handleTodayClick}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={handlePrevMonth}
                className={`p-1 rounded-sm border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNextMonth}
                className={`p-1 rounded-sm border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-sans text-[10px]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className={`font-semibold py-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
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
                  disabled={isFuture}
                  onClick={() => {
                    if (isFuture) return;
                    onSelectOrCreateDate(cell.dateStr);
                    onClose();
                  }}
                  title={isFuture ? 'Cannot create journal entries for future dates' : undefined}
                  className={`h-8 w-full rounded-sm text-xs flex flex-col items-center justify-center py-0.5 transition-colors cursor-pointer ${
                    isFuture
                      ? isDark
                        ? 'text-slate-600 opacity-30 cursor-not-allowed'
                        : 'text-slate-400 opacity-30 cursor-not-allowed'
                      : !cell.isCurrentMonth
                      ? isDark ? 'text-slate-600 opacity-40 hover:bg-slate-800/40' : 'text-slate-400 opacity-40 hover:bg-slate-100'
                      : cell.isToday
                      ? isDark
                        ? 'bg-white text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-900 text-white font-bold shadow-xs'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`leading-none ${cell.isToday ? 'font-bold' : 'font-medium'}`}>
                    {cell.dayNumber}
                  </span>
                  <span className="h-1 mt-0.5 flex items-center justify-center">
                    {cell.hasEntry && (
                      <span className={`w-1 h-1 rounded-full shrink-0 ${cell.isToday ? (isDark ? 'bg-slate-900' : 'bg-white') : (isDark ? 'bg-white' : 'bg-slate-900')}`} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`mt-4 pt-3 border-t flex items-center justify-between text-xs transition-colors ${
            isDark ? 'border-slate-800' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-3.5 text-[11px]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white' : 'bg-slate-900'}`} />
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Has Entry</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`w-2.5 h-2.5 rounded-xs ${isDark ? 'bg-white' : 'bg-slate-900'}`} />
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Today</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className={`px-3.5 py-1.5 rounded-sm font-semibold text-xs transition-colors cursor-pointer ${
              isDark
                ? 'bg-white text-slate-900 hover:bg-slate-100'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
