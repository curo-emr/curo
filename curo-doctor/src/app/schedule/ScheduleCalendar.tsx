"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Appointment } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  appointments: Appointment[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function ScheduleCalendar({ appointments, selectedDate, onDateSelect }: Props) {
  // Create a map of date string (YYYY-MM-DD) to count of appointments
  const appointmentCounts = appointments.reduce((acc, apt) => {
    acc[apt.date] = (acc[apt.date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="shadow-sm border-slate-200 h-full">
      <CardContent className="p-4 flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onDateSelect(date)}
          className="rounded-md"
          classNames={{
            day: "h-14 w-14 p-0 font-normal aria-selected:opacity-100 relative group cursor-pointer",
            day_selected:
              "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
            day_today: "bg-slate-100 text-slate-900",
            day_outside: "text-slate-400 opacity-50",
            head_cell: "text-slate-500 font-medium text-[0.8rem] w-14",
            table: "w-full border-collapse space-y-1",
            cell: "text-center text-sm p-0 flex justify-center items-center h-14 w-14",
          }}
          components={{
            DayButton: (props) => {
              const { day, modifiers, ...buttonProps } = props;
              // Add safe fallback for day
              if (!day || !day.date) return <></>;
              
              // Format date to match JSON format (YYYY-MM-DD)
              const dateObj = day.date;
              // Prevent hydration mismatch by calculating local timezone offset manually or just utilizing basic string formatting
              const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
              
              const count = appointmentCounts[formattedDate] || 0;
              const isSelected = modifiers.selected;

              return (
                <button
                   {...buttonProps}
                  className={`
                    h-full relative flex flex-col items-center justify-start pt-2 w-full rounded-md transition-colors
                    ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-900'}
                    ${modifiers.today && !isSelected ? 'bg-blue-50 font-bold' : ''}
                    ${modifiers.outside ? 'text-slate-400 opacity-50' : ''}
                  `}
                >
                  <span>{dateObj.getDate()}</span>
                  {count > 0 && (
                    <div className="absolute bottom-1 w-full flex justify-center pb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-700'}`}>
                        {count} {count === 1 ? 'visit' : 'visits'}
                      </span>
                    </div>
                  )}
                </button>
              );
            },
          }}
        />
      </CardContent>
    </Card>
  );
}
