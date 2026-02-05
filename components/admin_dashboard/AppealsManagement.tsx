"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import AppealReviewModal from "./AppealReviewModal";

type AppealStatus = "open" | "pending" | "closed";

interface Appeal {
  id: string;
  userName: string;
  reason: string;
  date: string;
  status: AppealStatus;
}

const sampleAppeals: Appeal[] = [
  {
    id: "1",
    userName: "John Smith",
    reason: "Disputed penalty charge",
    date: "2026-02-03",
    status: "open",
  },
  {
    id: "2",
    userName: "Sarah Johnson",
    reason: "Job cancellation appeal",
    date: "2026-02-02",
    status: "open",
  },
  {
    id: "3",
    userName: "Mike Davis",
    reason: "Rating dispute",
    date: "2026-02-01",
    status: "pending",
  },
  {
    id: "4",
    userName: "Emma Wilson",
    reason: "Payment issue",
    date: "2026-01-31",
    status: "pending",
  },
  {
    id: "5",
    userName: "Robert Brown",
    reason: "Account suspension appeal",
    date: "2026-01-25",
    status: "closed",
  },
  {
    id: "6",
    userName: "Lisa Anderson",
    reason: "Contract dispute",
    date: "2026-01-20",
    status: "closed",
  },
];

export default function AppealsManagement() {
  const [activeTab, setActiveTab] = useState<AppealStatus>("open");
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredAppeals = sampleAppeals.filter(
    (appeal) => appeal.status === activeTab
  );

  const tabConfig = [
    { value: "open" as AppealStatus, label: "Open", count: sampleAppeals.filter((a) => a.status === "open").length },
    { value: "pending" as AppealStatus, label: "Pending", count: sampleAppeals.filter((a) => a.status === "pending").length },
    { value: "closed" as AppealStatus, label: "Closed", count: sampleAppeals.filter((a) => a.status === "closed").length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Appeals Management</h1>
        <p className="text-slate-600">Review and manage penalty appeals</p>
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
          {filteredAppeals.length > 0 ? (
            <div className="space-y-4">
              {filteredAppeals.map((appeal) => (
                <Card key={appeal.id} className="p-4 border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">
                        {appeal.userName}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {appeal.reason}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Submitted: {appeal.date}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedAppeal(appeal);
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
              No {activeTab} appeals at this time
            </p>
          )}
        </div>
      </div>

      {selectedAppeal && (
        <AppealReviewModal
          appeal={selectedAppeal}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAppeal(null);
          }}
        />
      )}
    </div>
  );
}
