"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventColor } from "./types";
import {
  formatDateStr,
  getCalendarDays,
  isToday,
  isSameDay,
  addMonths,
  WEEKDAY_LABELS,
  MONTH_NAMES,
} from "./utils";

// ---------------------------------------------------------------------------
// Color map — each status maps to bg / text / dot token classes
// ---------------------------------------------------------------------------
const EVENT_COLORS: Record<
  CalendarEventColor,
  { pill: string; dot: string; selectedPill: string }
> = {
  blue: {
    pill: "bg-blue-50 text-blue-700 border border-blue-100",
    selectedPill: "bg-blue-100/80 text-blue-800 border border-blue-200",
    dot: "bg-blue-400",
  },
  green: {
    pill: "bg-green-50 text-green-700 border border-green-100",
    selectedPill: "bg-green-100/80 text-green-800 border border-green-200",
    dot: "bg-green-500",
  },
  yellow: {
    pill: "bg-amber-50 text-amber-700 border border-amber-100",
    selectedPill: "bg-amber-100/80 text-amber-800 border border-amber-200",
    dot: "bg-amber-400",
  },
  red: {
    pill: "bg-red-50 text-red-600 border border-red-100",
    selectedPill: "bg-red-100/80 text-red-700 border border-red-200",
    dot: "bg-red-400",
  },
  purple: {
    pill: "bg-purple-50 text-purple-700 border border-purple-100",
    selectedPill: "bg-purple-100/80 text-purple-800 border border-purple-200",
    dot: "bg-purple-400",
  },
  teal: {
    pill: "bg-teal-50 text-teal-700 border border-teal-100",
    selectedPill: "bg-teal-100/80 text-teal-800 border border-teal-200",
    dot: "bg-teal-400",
  },
  gray: {
    pill: "bg-slate-100 text-slate-500 border border-slate-200",
    selectedPill: "bg-slate-200/80 text-slate-600 border border-slate-300",
    dot: "bg-slate-400",
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface CuroCalendarProps {
  /** Events to display on the calendar. */
  events?: CalendarEvent[];
  /** The currently selected date (controlled). */
  selectedDate?: Date;
  /** Called when the user clicks a day. */
  onDateSelect?: (date: Date) => void;
  /** Max number of event pills shown per day before "+N more". Default: 3 */
  maxEventsPerDay?: number;
  /** Extra class names applied to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Sub-component: Event pill
// ---------------------------------------------------------------------------
function EventPill({
  event,
  isSelected,
}: {
  event: CalendarEvent;
  isSelected: boolean;
}) {
  const colors = EVENT_COLORS[event.color ?? "blue"];
  return (
    <span
      className={cn(
        "flex items-center gap-1 px-1.5 py-px rounded-md text-[10px] sm:text-[11px] font-medium truncate w-full leading-4",
        isSelected ? colors.selectedPill : colors.pill
      )}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full shrink-0", colors.dot)}
        aria-hidden="true"
      />
      <span className="truncate">{event.title}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CuroCalendar({
  events = [],
  selectedDate,
  onDateSelect,
  maxEventsPerDay = 3,
  className,
}: CuroCalendarProps) {
  // viewDate tracks which month is currently displayed
  const [viewDate, setViewDate] = useState<Date>(
    () => selectedDate ?? new Date()
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Build a lookup: dateStr → events[]
  const eventMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of events) {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    }
    return map;
  }, [events]);

  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  // Navigation
  const goToPrev = useCallback(() => setViewDate((d) => addMonths(d, -1)), []);
  const goToNext = useCallback(() => setViewDate((d) => addMonths(d, 1)), []);
  const goToToday = useCallback(() => {
    const today = new Date();
    setViewDate(today);
    onDateSelect?.(today);
  }, [onDateSelect]);

  const handleDayClick = useCallback(
    (date: Date, isCurrentMonth: boolean) => {
      // When clicking an out-of-month day, navigate to that month first
      if (!isCurrentMonth) {
        setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
      }
      onDateSelect?.(date);
    },
    [onDateSelect]
  );

  return (
    <div
      className={cn(
        "flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden",
        className
      )}
    >
      {/* ── Header: month/year title + navigation ── */}
      <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {MONTH_NAMES[month]}{" "}
            <span className="text-slate-400 font-normal text-lg">{year}</span>
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <div className="h-5 w-px bg-slate-200 mx-1" aria-hidden="true" />
          <button
            onClick={goToPrev}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNext}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Weekday header row ── */}
      <div className="grid grid-cols-7 bg-slate-50/70 border-b border-slate-100 shrink-0">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "py-3 text-center text-[11px] font-semibold uppercase tracking-widest select-none",
              i === 0 || i === 6 ? "text-slate-400" : "text-slate-500"
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* ── Day grid: 7 cols × 6 rows ── */}
      <div
        className="grid grid-cols-7 flex-1"
        style={{ gridTemplateRows: "repeat(6, minmax(110px, 1fr))" }}
      >
        {days.map((date, idx) => {
          const dateStr = formatDateStr(date);
          const dayEvents = eventMap[dateStr] ?? [];
          const isCurrentMonth = date.getMonth() === month;
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const today = isToday(date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const visibleEvents = dayEvents.slice(0, maxEventsPerDay);
          const overflowCount = dayEvents.length - maxEventsPerDay;

          // Border helpers: suppress outermost borders
          const isLastCol = (idx + 1) % 7 === 0;
          const isLastRow = idx >= 35;

          return (
            <button
              key={`${dateStr}-${idx}`}
              onClick={() => handleDayClick(date, isCurrentMonth)}
              className={cn(
                // Layout
                "relative flex flex-col p-2 sm:p-2.5 text-left transition-colors duration-100",
                // Focus ring
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                // Grid borders (internal only)
                !isLastCol && "border-r border-slate-100",
                !isLastRow && "border-b border-slate-100",
                // Base background
                !isCurrentMonth
                  ? "bg-slate-50/60"
                  : isWeekend
                  ? "bg-white/60"
                  : "bg-white",
                // Selected highlight
                isSelected && isCurrentMonth && "bg-blue-50/80",
                // Hover
                isCurrentMonth
                  ? "hover:bg-blue-50/50"
                  : "hover:bg-slate-100/50"
              )}
              aria-label={`${date.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}${dayEvents.length > 0 ? `, ${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}` : ""}`}
              aria-pressed={isSelected}
            >
              {/* Day number */}
              <time
                dateTime={dateStr}
                className={cn(
                  "self-start mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold shrink-0 transition-colors select-none",
                  // Out-of-month: very dim
                  !isCurrentMonth && "text-slate-300",
                  // Normal current-month day
                  isCurrentMonth &&
                    !today &&
                    !isSelected &&
                    (isWeekend ? "text-slate-500" : "text-slate-800"),
                  // Today: filled blue circle
                  today &&
                    "bg-blue-600 text-white shadow-sm shadow-blue-200",
                  // Selected but not today
                  isSelected &&
                    !today &&
                    "bg-blue-600 text-white shadow-sm shadow-blue-200",
                )}
              >
                {date.getDate()}
              </time>

              {/* Event pills */}
              <div className="flex flex-col gap-[3px] w-full overflow-hidden min-h-0">
                {visibleEvents.map((evt) => (
                  <EventPill key={evt.id} event={evt} isSelected={isSelected} />
                ))}
                {overflowCount > 0 && (
                  <span className="text-[10px] font-medium text-slate-400 pl-1.5 leading-tight">
                    +{overflowCount} more
                  </span>
                )}
              </div>

              {/* Subtle "has events" indicator when all pills are hidden */}
              {dayEvents.length > 0 && maxEventsPerDay === 0 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((evt) => (
                    <span
                      key={evt.id}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        EVENT_COLORS[evt.color ?? "blue"].dot
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
