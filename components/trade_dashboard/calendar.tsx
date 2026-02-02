"use client";

import React, { useRef, useState, useEffect } from "react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
import { Button } from '../ui/button';
import { TradeCalendarProps, TradeCalendarJob } from "@/types/trade-dashboard";

export default function TradeCalendar(props: TradeCalendarProps) {
  const { jobs = [] } = props;
  
  const sampleJobs: TradeCalendarJob[] = [
    { id: 'job-1', title: 'Install Wiring', startDate: '2026-02-05', endDate: '2026-02-05' },
    { id: 'job-2', title: 'Repair Roof', startDate: '2026-02-08', endDate: '2026-02-08' },
    { id: 'job-3', title: 'Paint Rooms', startDate: '2026-02-25', endDate: '2026-02-27' },
    { id: 'job-4', title: 'Plumb Kitchen', startDate: '2026-02-14', endDate: '2026-02-18' },
  ];
  const effectiveJobs: TradeCalendarJob[] = (Array.isArray(jobs) && jobs.length) ? jobs : sampleJobs;
  const calendarRef = useRef<InstanceType<typeof FullCalendar> | null>(null);
  const calendarWrapperRef = useRef<HTMLDivElement | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isNarrow, setIsNarrow] = useState<boolean>(false);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [monthTakenCount, setMonthTakenCount] = useState<number>(0);
  const [monthFreeCount, setMonthFreeCount] = useState<number>(0);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth <= 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Helper to format Date -> YYYY-MM-DD
  const isoDate = (d: Date): string => d.toISOString().split('T')[0];

  const updateMonthCounts = (start: Date, end: Date): void => {
    // iterate days from start (inclusive) to end (exclusive)
    let taken = 0;
    let total = 0;
    for (let dt = new Date(start); dt < end; dt.setDate(dt.getDate() + 1)) {
      const ds = isoDate(new Date(dt));
      // Only count days that belong to the calendar month (exclude padding if needed)
      // We'll count all days in the view range (FullCalendar month view usually includes padding days);
      total += 1;
      const hasJob = effectiveJobs.some((j: Record<string, unknown>) => {
        const s = String(j.startDate || j.start || '');
        const e = String(j.endDate || j.end || s);
        return s <= ds && ds <= e;
      });
      if (hasJob) taken += 1;
    }
    setMonthTakenCount(taken);
    setMonthFreeCount(Math.max(0, total - taken));
  };

  

  const events: EventInput[] = effectiveJobs.map((job) => ({
    id: job.id,
    title: job.title,
    start: job.startDate || job.start,
    // FullCalendar treats event `end` as exclusive for all-day events,
    // so set end to the day after the job's endDate to make it inclusive.
    end: (() => {
      const rawEnd = String(job.endDate || job.end || job.startDate || job.start);
      if (!rawEnd) return undefined;
      try {
        const d = new Date(rawEnd);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      } catch {
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
          const calendarOptions: Record<string, unknown> = {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            headerToolbar: isNarrow
              ? { left: 'prev,next', center: 'title', right: 'today' }
              : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
            events,
            dateClick: (info: Record<string, unknown>) => {
              const dateStr = String(info.dateStr);
              const hasJob = effectiveJobs.some((j: Record<string, unknown>) => {
                const start = String(j.startDate || j.start || '');
                const end = String(j.endDate || j.end || start);
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
            dayCellClassNames: (arg: Record<string, unknown>) => {
              const dateObj = arg.date as Date;
              const dateStr = dateObj.toISOString().split('T')[0];
              const classes: string[] = [];
              // Treat a day as taken if it falls between any job's startDate and endDate (inclusive).
              const hasJob = effectiveJobs.some((j: Record<string, unknown>) => {
                const start = String(j.startDate || j.start || '');
                const end = String(j.endDate || j.end || start);
                return start <= dateStr && dateStr <= end;
              });
              if (hasJob) classes.push('has-job');
              else classes.push('open-day');
              if (selectedDates && selectedDates.has(dateStr)) classes.push('selected-day');
              return classes;
            },
            // Only display the current month's dates (hide neighboring month days)
            showNonCurrentDates: false,
            // Do not force a 6-week grid; let month height vary to only show needed weeks
            fixedWeekCount: false,

            datesSet: (arg: { start: Date; end: Date }) => {
              // Compute the calendar month start/end from the current view's date
              try {
                const viewStart = arg.start; // beginning of the view range
                const monthStart = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1);
                const monthEnd = new Date(viewStart.getFullYear(), viewStart.getMonth() + 1, 1); // exclusive
                updateMonthCounts(monthStart, monthEnd);
              } catch (e) {
                // ignore
              }
            },
            height: 'auto',
          };

          return (
            <>
              <div ref={calendarWrapperRef} className="relative">
                <FullCalendar ref={calendarRef} {...calendarOptions} />
              </div>
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

                /* Additional mobile tweaks to make the calendar fit narrower screens */
                @media (max-width: 640px) {
                  /* Reduce overall card padding */
                  .rounded-md.border.p-4.bg-white { padding: 0.5rem; }

                  /* Make toolbar title smaller */
                  .fc .fc-toolbar-title { font-size: 1rem; }

                  /* Day frame: smaller gaps */
                  .fc .fc-daygrid-day-frame { padding: 0.5px 0.5px 1px; }

                  /* On mobile, drop strict square aspect ratio and use a modest height so the grid fits vertically */
                  .fc .fc-daygrid-day .fc-daygrid-day-top {
                    aspect-ratio: auto !important;
                    height: 48px !important;
                    padding: 4px !important;
                    border-radius: 8px !important;
                    font-size: 12px;
                  }

                  /* Reduce lock icon size and position slightly inward */
                  .fc .fc-daygrid-day.has-job .fc-daygrid-day-top::after {
                    top: 4px;
                    right: 4px;
                    font-size: 0.85rem;
                  }

                  /* Compact toolbar buttons */
                  .fc .fc-button { padding: 4px 6px !important; font-size: 0.75rem !important; }

                  /* Ensure selected inner box uses subtle border and smaller radius */
                  .fc .fc-daygrid-day.selected-day .fc-daygrid-day-top { border: 2px solid rgba(16,185,129,0.6) !important; border-radius: 8px !important; }

                  /* Make modal full-screen on small devices */
                  .bg-white.w-full.md\:w-96 { padding: 1rem; }
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
                /* Lock icon for booked days is handled on the inner day-top element (top-right). */

                /* Open days (brighter green) - shown for any date without jobs */
                .fc .open-day { background: rgba(34,197,94,0.18) !important; color: #065f46 !important; border-radius: 0.5rem; overflow: hidden; }

                /* Booked days: keep darker grey background, no colored border */
                .fc .has-job { background: #94a3b8 !important; color: #0f172a !important; border-radius: 0.5rem; overflow: hidden; }

                /* Selected day: only style the inner box */
                .fc .selected-day { box-shadow: none !important; }
                .fc .fc-daygrid-day.selected-day .fc-daygrid-day-top { background: rgba(34,197,94,0.18) !important; color: #065f46 !important; border: 2px solid rgba(16,185,129,0.6) !important; }

                /* Create small gaps between day cells by padding the outer frame and
                   applying backgrounds to the inner day-top element. This produces
                   horizontal and vertical spacing without breaking FullCalendar layout. */
                .fc .fc-daygrid-day-frame { padding: 1px 1px 2px; }
                .fc .fc-daygrid-day { background: transparent !important; }
                .fc .fc-daygrid-day .fc-daygrid-day-top {
                  width: 100%;
                  aspect-ratio: 1 / 1; /* keep square */
                  display: flex;
                  flex-direction: column;
                  align-items: flex-start; /* place content at the top-left */
                  justify-content: flex-start;
                  padding: 1px; /* minimal inner padding so content sits near top */
                  box-sizing: border-box;
                  border-radius: 10px;
                  overflow: hidden;
                  min-height: 0; /* prevent Flexbox stretching issues */
                }

                /* Adapt existing day states to target the inner top element so the
                   visible colored boxes respect the gaps. */
                .fc .fc-daygrid-day.has-job .fc-daygrid-day-top,
                .fc .has-job { background: transparent !important; }
                .fc .fc-daygrid-day.has-job .fc-daygrid-day-top { background: #94a3b8 !important; color: #0f172a !important; position: relative; }
                .fc .fc-daygrid-day.has-job .fc-daygrid-day-top::after {
                  content: "🔒";
                  position: absolute;
                  top: 6px;
                  right: 6px;
                  left: auto;
                  font-size: 0.95rem;
                  opacity: 0.95;
                  pointer-events: none;
                }

                .fc .fc-daygrid-day.open-day .fc-daygrid-day-top,
                .fc .open-day { background: transparent !important; }
                .fc .fc-daygrid-day.open-day .fc-daygrid-day-top { background: rgba(34,197,94,0.18) !important; color: #065f46 !important; }

              `}</style>
            </>
          );
        })()}

        <div className="mt-4 text-sm text-slate-600">
          {selectedDates && selectedDates.size > 0
            ? `Selected days: ${selectedDates.size}`
            : 'No dates selected'}
        </div>

        <div className="mt-2 text-sm text-slate-700">
          <span className="mr-4">Taken days this view: <strong>{monthTakenCount}</strong></span>
          <span className="mr-4">Free days: <strong>{monthFreeCount}</strong></span>
        </div>

        <div className="mt-4">
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setSelectedDates(new Set())} disabled={selectedDates.size === 0}>Clear Selection</Button>
            <Button onClick={() => alert('Save availability not implemented')}>Save Availability</Button>
          </div>
        </div>

        {/* Overlay for jobs on a day */}
        {openDay && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpenDay(null)} />
            <div className={`bg-white w-full md:w-96 rounded-t-lg md:rounded-lg p-4 z-60 max-h-[70vh] overflow-auto ${isNarrow ? 'rounded-t-lg' : 'mt-8'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Jobs for {openDay}</h4>
                <button className="text-slate-500 hover:text-slate-700" onClick={() => setOpenDay(null)}>Close</button>
              </div>
              <div>
                {effectiveJobs.filter((j: Record<string, unknown>) => {
                  const start = String(j.startDate || j.start || '');
                  const end = String(j.endDate || j.end || start);
                  return start <= openDay && openDay <= end;
                }).length === 0 && (
                  <div className="text-sm text-slate-600">No jobs for this day.</div>
                )}
                <ul className="space-y-2">
                  {effectiveJobs.filter((j: Record<string, unknown>) => {
                    const start = String(j.startDate || j.start || '');
                    const end = String(j.endDate || j.end || start);
                    return start <= openDay && openDay <= end;
                  }).map((job: Record<string, unknown>) => (
                    <li key={String(job.id)} className="p-2 border rounded-md">
                      <div className="font-medium">{String(job.title)}</div>
                      <div className="text-xs text-slate-500">{String(job.startDate || job.start) + (job.endDate || job.end ? ` — ${job.endDate || job.end}` : '')}</div>
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

