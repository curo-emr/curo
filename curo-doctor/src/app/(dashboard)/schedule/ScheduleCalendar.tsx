"use client";


import { Calendar } from "@/components/ui/calendar";
import { Appointment } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Card className="shadow-sm border-slate-200 w-full">
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
              const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
              
              const count = appointmentCounts[formattedDate] || 0;
              const isSelected = modifiers.selected;
              const isToday = modifiers.today;

              return (
                <button
                  {...buttonProps}
                  className={cn(
                    "group h-full w-full relative flex flex-col items-center justify-start pt-2 rounded-xl transition-all duration-200 border border-transparent outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    isSelected 
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                      : "hover:bg-slate-50 hover:border-slate-200 text-slate-700",
                    isToday && !isSelected ? "bg-blue-50 border-blue-100 text-blue-900 font-bold" : "",
                    modifiers.outside ? "text-slate-400 opacity-40 hover:bg-transparent" : "font-medium"
                  )}
                >
                  <span className="text-sm sm:text-base">
                    {dateObj.getDate()}
                  </span>
                  
                  {count > 0 && !modifiers.outside && (
                    <div className="absolute bottom-1 w-full flex justify-center px-1">
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full truncate max-w-full transition-colors", 
                        isSelected 
                          ? "bg-white/20 text-white" 
                          : isToday ? "bg-blue-200 text-blue-800" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      )}>
                        {count} {count === 1 ? 'vst' : 'vsts'}
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
