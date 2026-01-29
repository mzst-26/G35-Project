"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Ticket } from "@/types/support";
import { useSupport } from "@/hooks/useSupport";
import { MessageSquare } from "lucide-react";
import React from "react";

// Lightweight, UI-only skeleton for the company dashboard Support tab.
// No business logic, no storage, just a button to navigate to ticket creation page
// and a placeholder for ongoing tickets.

export default function Support() {
  const router = useRouter();

  const { tickets } = useSupport();
  const ongoing = tickets.filter((t) => t.status === 'open');

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
            {ongoing.length === 0 ? (
              <p className="text-sm text-slate-600 mt-2">No ongoing tickets. Create one to get started.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {ongoing.map((t) => (
                  <li key={t.id} className="text-sm text-slate-800">{t.title}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
