"use client";

import React from "react";
import { TradePenaltiesProps } from "@/types/trade-dashboard";

export default function Penalties(_props: TradePenaltiesProps) {

  const penalties = [
    { id: 1, reason: "Cancelled Job", amount: 45, date: "2025-11-03", status: "Unpaid" }, //example penalties
    { id: 2, reason: "Late To Job Repeatedly", amount: 120, date: "2025-09-21", status: "Paid" },
    { id: 3, reason: "Missing paperwork", amount: 30, date: "2025-07-12", status: "Disputed" },
  ];

  return (
    <div className="mt-6 rounded-md border p-6 bg-white"> 
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium">Penalties</h4>
        <p className="text-sm text-slate-500">Recent penalties and their statuses</p>
      </div>

      <div className="space-y-3">
        {penalties.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 rounded-md bg-slate-50">
            <div>
              <div className="text-sm font-semibold">{p.reason}</div>
              <div className="text-xs text-slate-500">{p.date} • #{p.id}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">${p.amount}</div>
              <div className={`text-xs ${p.status === 'Paid' ? 'text-green-600' : p.status === 'Unpaid' ? 'text-red-600' : 'text-amber-600'}`}>
                {p.status}
              </div>
            </div>

          </div>
        ))}

      </div>
    </div>
  );
}
