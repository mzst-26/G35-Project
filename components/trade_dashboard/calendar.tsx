"use client";

import React from "react";
import { TradeCalendarProps } from "@/types/trade-dashboard";

export default function TradeCalendar(_props: TradeCalendarProps) {
  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">Calendar</h3>
      <div className="rounded-md border p-6 bg-white">
        <p className="text-sm text-slate-600">Your upcoming jobs and availability will appear here.</p>
      </div>
    </div>
  );
}
