"use client";

import React from "react";
import { TradeSupportProps } from "@/types/trade-dashboard";

export default function Support(_props: TradeSupportProps) {
  const faqs = [
    {
      q: "How do I cancel a job?",
      a: "Open the job in the Jobs section and click 'Cancel Job' (if available). If you can't cancel, contact support and provide the job reference.",
    },
    {
      q: "How do I make a complaint?",
      a: "Email complaints@tradesfair.com with full details and any evidence.",
    },
    {
      q: "What is the average wait time for a job?",
      a: "Average wait time is typically 2-5 business days, depending on job complexity and provider availability.",
    },
  ];

  return (
    <div className="mt-6 rounded-md border p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium">Support & FAQ</h4>
        <p className="text-sm text-slate-500">Common questions and answers</p>
      </div>

      <div className="space-y-4">
        {faqs.map((f, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-md">
            <div className="text-sm font-semibold mb-1">{f.q}</div>
            <div className="text-xs text-slate-600">{f.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
