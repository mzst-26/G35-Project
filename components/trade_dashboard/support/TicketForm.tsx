"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
// Navigation-only skeleton: remove support hook for now

// Simple ticket creation form that uses `useSupport` hook (localStorage backed)
export default function TicketForm() {
  const router = useRouter();
  // no-op: backend integration will be added later

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigation-only: return to the dashboard support section
    router.push('/trade/dashboard?section=support');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold">Create Support Ticket</h1>
        <p className="text-sm text-slate-600 mt-1">Fill the form to create a ticket.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Details</label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={6} className="mt-1 block w-full rounded-md border px-3 py-2" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2" required />
          </div>

          <div className="mt-6 flex gap-2">
            <Button type="submit">Submit</Button>
            <Link href="/trade/dashboard?section=support"><Button variant="ghost">Back</Button></Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
