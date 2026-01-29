"use client";

import React from "react";
import { useSupport } from "@/hooks/useSupport";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Props {
  ticketId: string;
}

export default function TicketView({ ticketId }: Props) {
  const router = useRouter();
  const { getTicket, closeTicket } = useSupport();
  const ticket = getTicket(ticketId);

  if (!ticket) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-600">Ticket not found.</p>
        <div className="mt-4">
          <Button variant="ghost" onClick={() => router.push('/company/support')}>Back</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-bold">{ticket.title}</h1>
      <p className="text-xs text-slate-500">Requested: {new Date(ticket.createdAt).toLocaleString()}</p>
      <div className="mt-4 text-sm text-slate-700">{ticket.details}</div>
      <div className="mt-4 flex gap-2">
        {ticket.status === 'open' && (
          <Button onClick={() => { closeTicket(ticket.id); router.push('/company/support'); }}>Mark Resolved</Button>
        )}
        <Button variant="ghost" onClick={() => router.push('/company/support')}>Back</Button>
      </div>
    </Card>
  );
}
