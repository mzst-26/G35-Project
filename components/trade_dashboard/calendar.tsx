"use client";

import React, { useRef, useState, useEffect } from "react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
// @ts-ignore - interaction plugin types may not be present in the workspace
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
import { TradeCalendarProps } from "@/types/trade-dashboard";

export default function TradeCalendar(props: TradeCalendarProps) {
  const { jobs = [] } = props as any;
  const sampleJobs = [
    { id: 'job-1', title: 'Install Wiring', startDate: '2026-02-05', endDate: '2026-02-05' },
    { id: 'job-2', title: 'Repair Roof', startDate: '2026-02-08', endDate: '2026-02-08' },
  ];
  const effectiveJobs = (jobs && jobs.length) ? jobs : sampleJobs;
  const calendarRef = useRef<any>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isNarrow, setIsNarrow] = useState<boolean>(false);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth <= 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const events: EventInput[] = effectiveJobs.map((job: any) => ({
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
            headerToolbar: isNarrow
              ? { left: 'prev,next', center: 'title', right: 'today' }
              : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
            events,
            dateClick: (info: any) => {
              const dateStr = info.dateStr;
              setSelectedDates((prev: Set<string>) => {
                const next = new Set(prev);
                if (next.has(dateStr)) next.delete(dateStr);
                else next.add(dateStr);
                return next;
              });
            },
            dayCellClassNames: (arg: any) => {
              const dateStr = arg.date.toISOString().split('T')[0];
              return selectedDates && selectedDates.has(dateStr) ? ['selected-day'] : [];
            },
            height: 'auto',
          };

          return (
            <>
              <FullCalendar ref={calendarRef} {...calendarOptions} />
              <style jsx global>{`
                /* Toolbar layout tweaks */
                .fc { max-width: 100%; }
                .fc .fc-toolbar { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; }
                .fc .fc-toolbar .fc-toolbar-chunk { display:flex; align-items:center; gap:0.5rem; }

                /* Mobile: make toolbar chunks stack and spread */
                @media (max-width: 640px) {
                  .fc .fc-toolbar { padding: 0.25rem; }
                  .fc .fc-toolbar .fc-toolbar-chunk { width: 100%; justify-content: space-between; }
                  .fc .fc-button { padding: 6px 8px; font-size: 0.85rem; }
                }

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
                .fc .fc-button-primary + .fc-button { margin-left: 0.25rem; }

                /* Calendar title spacing */
                .fc .fc-toolbar-title { font-weight:600; color:#0f172a; }
                /* Highlight selected day cells */
                .fc .selected-day { background: rgba(37,99,235,0.12) !important; border-radius: 6px; }
              `}</style>
            </>
          );
        })()}

        <div className="mt-4 text-sm text-slate-600">
          {selectedDates && selectedDates.size > 0
            ? `Selected days: ${selectedDates.size}`
            : 'No dates selected'}
        </div>
      </div>
    </div>
  );
}

