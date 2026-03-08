"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import AppealReviewModal from "./AppealReviewModal";
import { useAppeals } from "@/hooks/useAppeals";
import { Appeal, AppealStatus, TabConfig } from "@/types/admin-dashboard";

export default function AppealsManagement(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<AppealStatus>("open");
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { getAppealsCount, getFilteredAppeals } = useAppeals();

  const filteredAppeals = getFilteredAppeals(activeTab);

  const tabConfig: TabConfig<AppealStatus>[] = [
    { value: "open", label: "Open", count: getAppealsCount("open") },
    { value: "pending", label: "Pending", count: getAppealsCount("pending") },
    { value: "closed", label: "Closed", count: getAppealsCount("closed") },
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
