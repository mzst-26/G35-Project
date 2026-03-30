"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TicketForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState("");

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">Create Support Ticket</h1>
        <p className="text-sm text-slate-600 mt-1">Ticket submission is pending backend integration.</p>

        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          TODO: submit ticket create payload to Communications service and persist ticket IDs/status in Core references.
        </div>

        <form className="mt-6 space-y-4" onSubmit={(event) => event.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Details</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={6}
              className="mt-1 block w-full rounded-md border px-3 py-2"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2"
              disabled
            />
          </div>

          <div className="mt-6 flex gap-2">
            <Button type="button" disabled>
              Submit
            </Button>
            <Link href="/company/dashboard/home?section=support"><Button variant="ghost">Back</Button></Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
