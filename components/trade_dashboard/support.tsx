"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import React from "react";
// Lightweight, UI-only skeleton for the trade dashboard Support tab.
// No business logic, no storage, just a button to navigate to ticket creation page
// and a placeholder for ongoing tickets.

export default function Support() {
  const router = useRouter();
  const exampleTickets = [
    { id: "TCK-1042", title: "Payment pending for Job #7841", date: "2 Feb 2026", status: "Open" },
    { id: "TCK-1051", title: "Reschedule requested for Job #7903", date: "30 Jan 2026", status: "Open" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support</h1>
          <p className="text-slate-600">Create and manage support tickets</p>
        </div>
        <div>
          <Button onClick={() => router.push('/trade/support/new')}>Create Ticket</Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Ongoing:</h2>
            <p className="text-sm text-slate-600 mt-2">Example tickets (navigation skeleton).</p>
            <div className="mt-3 space-y-2">
              {exampleTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{ticket.title}</p>
                    <span className="text-xs text-slate-500">{ticket.status}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{ticket.id} • {ticket.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
