"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import React from "react";

export default function Support() {
  const router = useRouter();

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
            <p className="text-sm text-slate-600 mt-2">
              No live ticket feed is available yet.
            </p>
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              TODO: connect this panel to Communications service ticket endpoints for list/filter/status updates.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
