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
    { id: 'job-3', title: 'Paint Rooms', startDate: '2026-02-25', endDate: '2026-02-27' },
    { id: 'job-4', title: 'Plumb Kitchen', startDate: '2026-02-14', endDate: '2026-02-18' },
  ];
  const effectiveJobs = (jobs && jobs.length) ? jobs : sampleJobs;
  const calendarRef = useRef<any>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isNarrow, setIsNarrow] = useState<boolean>(false);
  const [openDay, setOpenDay] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth <= 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const events: EventInput[] = effectiveJobs.map((job: any) => ({
    id: job.id,
    title: job.title,
    start: job.startDate || job.start,
    // FullCalendar treats event `end` as exclusive for all-day events,
    // so set end to the day after the job's endDate to make it inclusive.
    end: (() => {
      const rawEnd = job.endDate || job.end || job.startDate || job.start;
      if (!rawEnd) return undefined;
      try {
        const d = new Date(rawEnd);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      } catch (e) {
        return rawEnd;
      }
    })(),
    allDay: true,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-semibold">Calendar</h3>
        <div className="flex items-center gap-2">
          <button
            className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${selectedDates.size === 0 ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-700 text-white'}`}
            onClick={() => setSelectedDates(new Set())}
            disabled={selectedDates.size === 0}
          >
            Clear Selection
          </button>
        </div>
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
              const hasJob = effectiveJobs.some((j: any) => {
                const start = j.startDate || j.start || '';
                const end = j.endDate || j.end || start;
                return start <= dateStr && dateStr <= end;
              });
              if (hasJob) {
                // open overlay for job days
                setOpenDay(dateStr);
                return;
              }
              // otherwise toggle selection for open days
              setSelectedDates((prev: Set<string>) => {
                const next = new Set(prev);
                if (next.has(dateStr)) next.delete(dateStr);
                else next.add(dateStr);
                return next;
              });
            },
            dayCellClassNames: (arg: any) => {
              const dateStr = arg.date.toISOString().split('T')[0];
              const classes: string[] = [];
              // Treat a day as taken if it falls between any job's startDate and endDate (inclusive).
              const hasJob = effectiveJobs.some((j: any) => {
                const start = j.startDate || j.start || '';
                const end = j.endDate || j.end || start;
                return start <= dateStr && dateStr <= end;
              });
              if (hasJob) classes.push('has-job');
              else classes.push('open-day');
              if (selectedDates && selectedDates.has(dateStr)) classes.push('selected-day');
              return classes;
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

                /* Days that have jobs (darker grey) */
                .fc .has-job { background: #94a3b8 !important; color: #0f172a !important; border-radius: 6px; position: relative; }
                /* Lock icon in the top-left of a day with a job */
                .fc .has-job::after {
                  content: "🔒";
                  position: absolute;
                  top: 6px;
                  left: 6px;
                  right: auto;
                  font-size: 0.95rem;
                  line-height: 1;
                  opacity: 0.95;
                  pointer-events: none;
                }

                /* Open days (brighter green) - shown for any date without jobs */
                .fc .open-day { background: rgba(34,197,94,0.18) !important; border: 1px solid rgba(34,197,94,0.24) !important; color: #065f46 !important; border-radius: 6px; }

                /* Explicitly selected days: black border */
                .fc .selected-day { box-shadow: none !important; border: 2px solid #000 !important; border-radius: 6px; }
              `}</style>
            </>
          );
        })()}

        <div className="mt-4 text-sm text-slate-600">
          {selectedDates && selectedDates.size > 0
            ? `Selected days: ${selectedDates.size}`
            : 'No dates selected'}
        </div>
        {openDay && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpenDay(null)} />
            <div className={`bg-white w-full md:w-96 rounded-t-lg md:rounded-lg p-4 z-60 max-h-[70vh] overflow-auto ${isNarrow ? 'rounded-t-lg' : 'mt-8'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Jobs for {openDay}</h4>
                <button className="text-slate-500 hover:text-slate-700" onClick={() => setOpenDay(null)}>Close</button>
              </div>
              <div>
                {effectiveJobs.filter((j: any) => {
                  const start = j.startDate || j.start || '';
                  const end = j.endDate || j.end || start;
                  return start <= openDay && openDay <= end;
                }).length === 0 && (
                  <div className="text-sm text-slate-600">No jobs for this day.</div>
                )}
                <ul className="space-y-2">
                  {effectiveJobs.filter((j: any) => {
                    const start = j.startDate || j.start || '';
                    const end = j.endDate || j.end || start;
                    return start <= openDay && openDay <= end;
                  }).map((job: any) => (
                    <li key={job.id} className="p-2 border rounded-md">
                      <div className="font-medium">{job.title}</div>
                      <div className="text-xs text-slate-500">{(job.startDate || job.start) + (job.endDate || job.end ? ` — ${job.endDate || job.end}` : '')}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

