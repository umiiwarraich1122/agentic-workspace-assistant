import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function MiniCalendar({ events = [] }: { events?: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const today = new Date();

  // Highlight days with events
  const eventDays = new Set(
    events.map(ev => {
      const raw = ev.date || ev.start_time || ev.start?.dateTime || ev.start?.date;
      if (!raw) return -1;
      const dt = new Date(raw);
      if (dt.getMonth() === currentDate.getMonth() && dt.getFullYear() === currentDate.getFullYear()) {
        return dt.getDate();
      }
      return -1;
    })
  );

  return (
    <div className="bg-gray-950/60 backdrop-blur-md border border-cyan-900/30 rounded-2xl p-6 w-full max-w-sm flex-shrink-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white font-mono font-bold text-lg">
          {monthNames[currentDate.getMonth()]} <span className="text-cyan-500">{currentDate.getFullYear()}</span>
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-mono text-gray-500 uppercase">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={\empty-\\} className="h-10"></div>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
          const hasEvent = eventDays.has(day);
          
          return (
            <div 
              key={day} 
              className={\h-10 flex flex-col items-center justify-center rounded-lg text-sm font-mono relative transition-all
                \
                \
              \}
            >
              {day}
              {hasEvent && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-cyan-400"></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
