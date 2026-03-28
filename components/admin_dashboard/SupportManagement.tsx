"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import TicketReviewModal from "./TicketReviewModal";
import { useTickets } from "@/hooks/useTickets";
import { Ticket, TicketStatus, TabConfig } from "@/types/admin-dashboard";

export default function SupportManagement(): React.JSX.Element {
  // TODO(communications-service): Replace empty ticket state with real admin support queue
  // once Communications Service ticket endpoints are available.
  const [activeTab, setActiveTab] = useState<TicketStatus>("open");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { getTicketsCount, getFilteredTickets, isLoading, error } = useTickets();

  const filteredTickets = getFilteredTickets(activeTab);

  const tabConfig: TabConfig<TicketStatus>[] = [
    { value: "open", label: "Open", count: getTicketsCount("open") },
    { value: "pending", label: "Pending", count: getTicketsCount("pending") },
    { value: "closed", label: "Closed", count: getTicketsCount("closed") },
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
          {isLoading ? (
            <p className="text-slate-600 text-center py-8">Loading tickets...</p>
          ) : error ? (
            <p className="text-red-600 text-center py-8">{error}</p>
          ) : filteredTickets.length > 0 ? (
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
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsModalOpen(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-black border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Review
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-center py-8">
              No {activeTab} tickets at this time. Support ticket integration is pending backend endpoints.
            </p>
          )}
        </div>
      </div>

      {selectedTicket && (
        <TicketReviewModal
          ticket={selectedTicket}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTicket(null);
          }}
        />
      )}
    </div>
  );
}
