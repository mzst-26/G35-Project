"use client";

import React from "react";
import { TradeJobsProps } from "@/types/trade-dashboard";
// Penalties moved to its own dashboard page

export default function TradeJobs(_props: TradeJobsProps) {
  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">Jobs</h3>
      
      <div className="rounded-md border p-6 bg-white">
        <p className="text-sm text-slate-600">Manage your active and past jobs here.</p>
      </div>

      {/* Penalties page moved — no penalty UI here */}
    </div>
  );
}
