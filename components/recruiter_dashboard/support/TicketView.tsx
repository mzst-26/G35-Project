"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Props {
  ticketId: string;
}

export default function TicketView({ ticketId }: Props) {
  const router = useRouter();

  // TODO: fetch ticket details from Communications service by ticketId.
  return (
    <Card className="p-6">
      <h1 className="text-xl font-bold">Ticket {ticketId}</h1>
      <p className="text-sm text-slate-600 mt-2">Details will appear here once backend is connected.</p>
      <div className="mt-4 flex gap-2">
        <Button variant="ghost" onClick={() => router.push('/company/support')}>Back</Button>
      </div>
    </Card>
  );
}
