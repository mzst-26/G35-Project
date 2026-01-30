"use client";

import React, { useRef, useState } from "react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
// @ts-ignore - interaction plugin types may not be present in the workspace
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
import { TradeCalendarProps } from "@/types/trade-dashboard";

export default function TradeCalendar(props: TradeCalendarProps) {
  const { jobs = [] } = props as any;
  const calendarRef = useRef<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const events: EventInput[] = jobs.map((job: any) => ({
    id: job.id,
    title: job.title,
    start: job.startDate,
    end: job.endDate,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-semibold">Calendar</h3>
      </div>

      <div className="rounded-md border p-4 bg-white">
        {(() => {
          const calendarOptions: any = {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            headerToolbar: {
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            },
            events,
            dateClick: (info: any) => setSelectedDate(info.dateStr),
            height: 'auto',
          };

          return (
            <>
              <FullCalendar ref={calendarRef} {...calendarOptions} />
              <style jsx global>{`
                /* Toolbar layout tweaks */
                .fc .fc-toolbar { display:flex; align-items:center; gap:0.5rem; }
                .fc .fc-toolbar .fc-toolbar-chunk { display:flex; align-items:center; gap:0.5rem; }

                /* Button base style to match app UI */
                .fc .fc-button {
                  background: #f8fafc; /* slate-50 */
                  color: #0f172a; /* slate-900 */
                  border: 1px solid transparent;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-weight: 500;
                  box-shadow: none;
                }
                .fc .fc-button:hover { background: #f1f5f9; }

                /* Primary button (today) style */
                .fc .fc-button.fc-button-primary,
                .fc .fc-button.fc-button-active {
                  background: #2563eb; /* blue-600 */
                  color: white;
                  border-color: transparent;
                }

                /* Make view buttons compact */
                .fc .fc-button-primary + .fc-button {
                  margin-left: 0.25rem;
                }

                /* Calendar title spacing */
                .fc .fc-toolbar-title { font-weight:600; color:#0f172a; }
              `}</style>
            </>
          );
        })()}

        <div className="mt-4 text-sm text-slate-600">
          {selectedDate ? `Selected: ${selectedDate}` : 'No date selected'}
        </div>
      </div>
    </div>
  );
}

