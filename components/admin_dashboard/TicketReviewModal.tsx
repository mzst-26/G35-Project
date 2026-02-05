"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface Ticket {
  id: string;
  userName: string;
  subject: string;
  date: string;
  status: "open" | "pending" | "closed";
}

interface TicketReviewModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
}

type TicketTab = "details" | "notes" | "attachments" | "history";

export default function TicketReviewModal({
  ticket,
  isOpen,
  onClose,
}: TicketReviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TicketTab>("details");
  const [title, setTitle] = useState(ticket.subject);
  const [details, setDetails] = useState(
    "Support ticket submitted by " + ticket.userName
  );
  const [date, setDate] = useState(ticket.date);
  const [notes, setNotes] = useState("");
  const [resolution, setResolution] = useState<"resolved" | "closed" | "">("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({
      ticketId: ticket.id,
      title,
      details,
      date,
      notes,
      resolution,
    });
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const tabs: { value: TicketTab; label: string }[] = [
    { value: "details", label: "Details" },
    { value: "notes", label: "Notes" },
    { value: "attachments", label: "Attachments" },
    { value: "history", label: "History" },
  ];

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            Review Ticket - {ticket.userName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => (
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
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Details
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={6}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Admin Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                  placeholder="Add your notes here..."
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Resolution
                </label>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="resolution"
                      value="resolved"
                      checked={resolution === "resolved"}
                      onChange={(e) =>
                        setResolution(e.target.value as "resolved" | "closed")
                      }
                    />
                    <span className="text-slate-700">Mark as Resolved</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="resolution"
                      value="closed"
                      checked={resolution === "closed"}
                      onChange={(e) =>
                        setResolution(e.target.value as "resolved" | "closed")
                      }
                    />
                    <span className="text-slate-700">Close Ticket</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === "attachments" && (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
                <p className="text-slate-600">
                  No attachments for this ticket
                </p>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600">
                  <strong>Created:</strong> {ticket.date} by {ticket.userName}
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  <strong>Status:</strong> {ticket.status}
                </p>
              </div>
              <div className="text-center text-slate-600">
                <p>No additional history available</p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" className="bg-black text-white hover:bg-gray-900">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );

  return createPortal(modalContent, document.body);
}
