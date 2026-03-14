"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useApplications } from "@/hooks/useApplications";
import {
  ApplicationStatus,
  ApplicationType,
} from "@/types/admin-applications";
import {
  TabConfig,
} from "@/types/admin-dashboard";

export default function ApplicationsManagement(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<ApplicationStatus>("pending");
  const [activeType, setActiveType] = useState<ApplicationType>("recruiter");
  const [searchQuery, setSearchQuery] = useState("");

  const { getApplicationsCount, getFilteredApplications, getApplicationsByType, isLoading, error } =
    useApplications();

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return getFilteredApplications(activeTab)
      .filter((application) => application.type === activeType)
      .filter((application) => {
        if (!query) return true;

        return (
          application.applicantName.toLowerCase().includes(query) ||
          application.id.toLowerCase().includes(query)
        );
      });
  }, [activeTab, activeType, searchQuery, getFilteredApplications]);

  const tabConfig: TabConfig<ApplicationStatus>[] = [
    { value: "pending", label: "Pending", count: getApplicationsCount("pending") },
    {
      value: "approved",
      label: "Approved",
      count: getApplicationsCount("approved"),
    },
    {
      value: "rejected",
      label: "Rejected",
      count: getApplicationsCount("rejected"),
    },
  ];

  const typeConfig: Array<{ value: ApplicationType; label: string; count: number }> = [
    {
      value: "recruiter",
      label: "Company Applications",
      count: getApplicationsByType("recruiter").length,
    },
  ];

  const getStatusPillClasses = (status: ApplicationStatus): string => {
    if (status === "approved") return "bg-emerald-100 text-emerald-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-800";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Applications</h1>
        <p className="text-slate-600">
          Review recruiter and trade registration surveys in separate sections and open each case on its own review page.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-wrap gap-2">
            {typeConfig.map((typeItem) => (
              <button
                key={typeItem.value}
                onClick={() => setActiveType(typeItem.value)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeType === typeItem.value
                    ? "bg-black text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {typeItem.label} ({typeItem.count})
              </button>
            ))}
          </div>

          <div className="mt-4 max-w-md">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by applicant name or application ID"
            />
          </div>
        </div>

        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabConfig.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.value
                  ? "border-b-2 border-black text-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
              <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {isLoading ? (
            <p className="py-8 text-center text-slate-600">Loading applications...</p>
          ) : error ? (
            <p className="py-8 text-center text-red-600">{error}</p>
          ) : filteredApplications.length > 0 ? (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <Card key={application.id} className="border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{application.applicantName}</h3>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusPillClasses(
                            application.status
                          )}`}
                        >
                          {application.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        Type: {application.type} • ID: {application.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Submitted: {application.submittedAt}
                      </p>
                      {application.adminReason && (
                        <p className="mt-2 text-sm text-slate-700">
                          <strong>Decision reason:</strong> {application.adminReason}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/admin/dashboard/applications/${application.id}`}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-slate-50"
                    >
                      Review
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-slate-600">No matching applications found</p>
          )}
        </div>
      </div>
    </div>
  );
}
