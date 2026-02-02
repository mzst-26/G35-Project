"use client";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  AlertTriangle,
  ArrowRight,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  PoundSterling,
} from "lucide-react";
import type { TradeUpcomingJob } from "@/types/trade-dashboard";

interface TradeJobCardProps {
  job: TradeUpcomingJob;
  onViewDetails: () => void;
  countdownText?: string;
}

export default function TradeJobCard({
  job,
  onViewDetails,
  countdownText,
}: TradeJobCardProps) {
  return (
    <Card
      className="shadow-sm border-slate-200 hover:shadow-md transition-shadow cursor-pointer !py-3"
      onClick={onViewDetails}
    >
      <CardContent className="pt-3 sm:pt-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
              <h3 className="text-base sm:text-lg text-slate-900">{job.title}</h3>
              <Badge
                className={
                  job.status === "pending"
                    ? "bg-amber-50 text-amber-700 border-amber-200 border text-xs"
                    : job.status === "upcoming"
                      ? "bg-blue-50 text-blue-700 border-blue-200 border text-xs"
                      : job.status === "completed"
                        ? "bg-slate-900 text-white border-slate-900 border text-xs"
                        : "bg-red-50 text-red-700 border-red-200 border text-xs"
                }
              >
                {job.status === "pending" && (
                  <span className="relative mr-1.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-90 animate-ping" />
                    <span className="relative inline-flex h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-orange-500" />
                  </span>
                )}
                {job.status === "upcoming" && (
                  <CheckCircle2 className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                )}
                {job.status === "completed" && (
                  <CheckCircle2 className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                )}
                {job.status === "rejected" && (
                  <AlertTriangle className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                )}
                <span className="hidden sm:inline">
                  {job.status === "pending"
                    ? "Pending"
                    : job.status === "upcoming"
                      ? "Upcoming"
                      : job.status === "completed"
                        ? "Completed"
                        : "Rejected"}
                </span>
                <span className="sm:hidden">
                  {job.status === "pending"
                    ? "Pend."
                    : job.status === "upcoming"
                      ? "Upco."
                      : job.status === "completed"
                        ? "Done"
                        : "Rej."}
                </span>
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3">
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <Building className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate text-xs sm:text-sm">{job.company}</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate text-xs sm:text-sm">{job.location}</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">{job.date}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-green-600 text-sm sm:text-base">
              <PoundSterling className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="font-semibold">
                £{job.pay}/day · {job.days} days
              </span>
            </div>
            {job.status === "pending" && countdownText && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 animate-pulse">
                <Clock className="h-3 w-3" />
                <span>{countdownText} left to accept</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full lg:w-auto text-xs sm:text-sm py-1 sm:py-2"
          >
            Details
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
