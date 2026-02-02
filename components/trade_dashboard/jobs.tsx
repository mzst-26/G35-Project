"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Briefcase,
  Clock,
  CheckCircle2,
  Search,
  Info,
} from "lucide-react";
import { TradeJobsProps, TradeUpcomingJob } from "@/types/trade-dashboard";
import TradeJobCard from "@/components/trade_dashboard/trade_job_cards";
import { useTradeJobs } from "@/hooks/useTradeJobs";

export default function TradeJobs(_props: TradeJobsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "upcoming" | "completed" | "all">("pending");
  
  // Use the hook to fetch jobs
  const { jobs, stats, isLoading } = useTradeJobs();

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === "all" || job.status === activeTab;

    return matchesSearch && matchesTab;
  });

  const tabCounts = {
    all: jobs.length,
    pending: jobs.filter((j) => j.status === "pending").length,
    upcoming: jobs.filter((j) => j.status === "upcoming").length,
    completed: jobs.filter((j) => j.status === "completed").length,
  };

  // Use stats from hook, fallback to local calculation if needed
  const displayStats = {
    pendingJobs: stats.pending,
    upcomingJobs: stats.upcoming,
    completedEarnings: stats.completedEarnings,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl text-slate-900 mb-2">My Jobs</h1>
        <p className="text-slate-600">View and manage jobs allocated to you</p>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Pending Jobs:</strong> You have <strong>{tabCounts.pending}</strong> job(s) awaiting your decision. Review and accept or reject them before the deadline. Rejecting after acceptance will incur a penalty fee of <strong>£50</strong>.
        </AlertDescription>
      </Alert>

      {/* Loading state */}
      {isLoading && (
        <Card className="shadow-sm border-slate-200 !py-3 mb-6">
          <CardContent className="pt-3 text-center py-8">
            <p className="text-slate-600">Loading jobs...</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-6">
        <Card className="shadow-sm border-slate-200 !py-3">
          <CardContent className="pt-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 sm:h-10 w-8 sm:w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 sm:h-5 w-4 sm:w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-lg sm:text-2xl text-slate-900 mb-0.5 font-semibold">{displayStats.pendingJobs}</p>
            <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">Pending Jobs</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 !py-3">
          <CardContent className="pt-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 sm:h-10 w-8 sm:w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 sm:h-5 w-4 sm:w-5 text-green-600" />
              </div>
            </div>
            <p className="text-lg sm:text-2xl text-slate-900 mb-0.5 font-semibold">{displayStats.upcomingJobs}</p>
            <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">Upcoming Jobs</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 !py-3">
          <CardContent className="pt-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 sm:h-10 w-8 sm:w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-4 sm:h-5 w-4 sm:w-5 text-slate-600" />
              </div>
            </div>
            <p className="text-lg sm:text-2xl text-slate-900 mb-0.5 font-semibold">£{displayStats.completedEarnings}</p>
            <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">Earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search by job title, company, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-slate-200 overflow-x-auto">
        {["pending", "upcoming", "completed", "all"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} (
            {tabCounts[tab as keyof typeof tabCounts]})
          </button>
        ))}
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <Card className="shadow-sm border-slate-200 !py-3">
            <CardContent className="pt-3 text-center py-12">
              <Briefcase className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <h3 className="text-lg text-slate-900 mb-1">No jobs found</h3>
              <p className="text-sm text-slate-500">
                {activeTab === "pending"
                  ? "You have no pending jobs at the moment."
                  : activeTab === "upcoming"
                    ? "You have no upcoming jobs yet."
                    : "Try adjusting your search or check other tabs"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.id}>
              <TradeJobCard job={job} onViewDetails={() => {}} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
