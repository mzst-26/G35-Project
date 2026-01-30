"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import React from "react";

// Lightweight, UI-only skeleton for the company dashboard Support tab.
// No business logic, no storage, just a button to navigate to ticket creation page
// and a placeholder for ongoing tickets.

export default function Support() {
  const router = useRouter();

  // Navigation-only skeleton: no storage or hook logic yet

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support</h1>
          <p className="text-slate-600">Create and manage support tickets</p>
        </div>
        <div>
          <Button onClick={() => router.push('/company/support/new')}>Create Ticket</Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Ongoing:</h2>
            <p className="text-sm text-slate-600 mt-2">No ongoing tickets to show (navigation skeleton).</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
