"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

type TicketStatus = "open" | "pending" | "closed";

interface Ticket {
  id: string;
  userName: string;
  subject: string;
  date: string;
  status: TicketStatus;
}

const sampleTickets: Ticket[] = [
  {
    id: "1",
    userName: "Alex Turner",
    subject: "Unable to access dashboard",
    date: "2026-02-04",
    status: "open",
  },
  {
    id: "2",
    userName: "Rachel Green",
    subject: "Payment not processed",
    date: "2026-02-04",
    status: "open",
  },
  {
    id: "3",
    userName: "David Chen",
    subject: "Profile update issue",
    date: "2026-02-03",
    status: "pending",
  },
  {
    id: "4",
    userName: "Maria Garcia",
    subject: "Job posting error",
    date: "2026-02-02",
    status: "pending",
  },
  {
    id: "5",
    userName: "James Wilson",
    subject: "Account verification",
    date: "2026-01-30",
    status: "closed",
  },
  {
    id: "6",
    userName: "Linda Martinez",
    subject: "Password reset request",
    date: "2026-01-28",
    status: "closed",
  },
];

export default function SupportManagement() {
  const [activeTab, setActiveTab] = useState<TicketStatus>("open");

  const filteredTickets = sampleTickets.filter(
    (ticket) => ticket.status === activeTab
  );

  const tabConfig = [
    { value: "open" as TicketStatus, label: "Open", count: sampleTickets.filter((t) => t.status === "open").length },
    { value: "pending" as TicketStatus, label: "Pending", count: sampleTickets.filter((t) => t.status === "pending").length },
    { value: "closed" as TicketStatus, label: "Closed", count: sampleTickets.filter((t) => t.status === "closed").length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Support Management</h1>
        <p className="text-slate-600">Review and manage support tickets</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {tabConfig.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === tab.value
                  ? "border-b-2 border-black text-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-sm rounded-full bg-slate-100">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {filteredTickets.length > 0 ? (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <Card key={ticket.id} className="p-4 border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">
                        {ticket.userName}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {ticket.subject}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Submitted: {ticket.date}
                      </p>
                    </div>
                    <button className="px-4 py-2 text-sm font-medium text-black border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                      Review
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-center py-8">
              No {activeTab} tickets at this time
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
