"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, AlertCircle } from "lucide-react";
import React from "react";
import { useSupport } from "@/hooks/useSupport";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Trade Dashboard Support tab component
// Uses `useSupport` hook for ticket management (localStorage backed for now)

export default function Support() {
  const router = useRouter();
  const { tickets } = useSupport();

  const openTickets = tickets.filter((t) => t.status === "open");
  const closedTickets = tickets.filter((t) => t.status === "closed");

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl text-slate-900 mb-2">Support</h1>
          <p className="text-slate-600">Create and manage support tickets</p>
        </div>
        <Button onClick={() => router.push("/trade/support/new")} className="bg-blue-600 hover:bg-blue-700">
          Create Ticket
        </Button>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <AlertCircle className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Need help? Submit a support ticket below and our team will respond within 24-48 hours.
        </AlertDescription>
      </Alert>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Tickets */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Open Tickets</CardTitle>
            <CardDescription>{openTickets.length} ticket(s) waiting for response</CardDescription>
          </CardHeader>
          <CardContent>
            {openTickets.length === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-600 text-sm">No open tickets</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 border border-slate-200 rounded-lg hover:border-slate-300 cursor-pointer transition-colors"
                    onClick={() => router.push(`/trade/support/${ticket.id}`)}
                  >
                    <p className="font-semibold text-slate-900 text-sm">{ticket.title}</p>
                    <p className="text-xs text-slate-600 mt-1">Created {new Date(ticket.createdAt).toLocaleDateString("en-GB")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Closed Tickets */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Closed Tickets</CardTitle>
            <CardDescription>{closedTickets.length} ticket(s) resolved</CardDescription>
          </CardHeader>
          <CardContent>
            {closedTickets.length === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-600 text-sm">No closed tickets</p>
              </div>
            ) : (
              <div className="space-y-3">
                {closedTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 border border-slate-200 rounded-lg hover:border-slate-300 cursor-pointer transition-colors bg-slate-50"
                    onClick={() => router.push(`/trade/support/${ticket.id}`)}
                  >
                    <p className="font-semibold text-slate-900 text-sm">{ticket.title}</p>
                    <p className="text-xs text-slate-600 mt-1">Closed {new Date(ticket.createdAt).toLocaleDateString("en-GB")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
