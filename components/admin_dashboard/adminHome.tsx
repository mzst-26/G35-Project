"use client";

import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  FileWarning,
  LifeBuoy,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { useAppeals } from "@/hooks/useAppeals";
import { useTickets } from "@/hooks/useTickets";
import type { DashboardMetric } from "@/types/admin-dashboard";

export default function AdminHome(): React.JSX.Element {
  const { getAppealsCount } = useAppeals();
  const { getTicketsCount } = useTickets();

  const openAppeals = getAppealsCount("open");
  const pendingAppeals = getAppealsCount("pending");
  const closedAppeals = getAppealsCount("closed");

  const openTickets = getTicketsCount("open");
  const pendingTickets = getTicketsCount("pending");
  const closedTickets = getTicketsCount("closed");

  const totalQueueItems =
    openAppeals + pendingAppeals + openTickets + pendingTickets;
  const totalResolvedItems = closedAppeals + closedTickets;
  const totalTrackedItems = totalQueueItems + totalResolvedItems;

  const completionRate =
    totalTrackedItems === 0
      ? "0%"
      : `${Math.round((totalResolvedItems / totalTrackedItems) * 100)}%`;

  const operationalHealth =
    totalQueueItems <= 4
      ? "Healthy"
      : totalQueueItems <= 8
      ? "Moderate"
      : "Needs Attention";

  const metrics: DashboardMetric[] = [
    {
      label: "Open Appeals",
      value: String(openAppeals),
      icon: AlertTriangle,
    },
    {
      label: "Open Support Tickets",
      value: String(openTickets),
      icon: MessageSquare,
    },
    {
      label: "Resolved Items",
      value: String(totalResolvedItems),
      icon: CheckCircle,
    },
    {
      label: "Operational Health",
      value: operationalHealth,
      icon: ShieldCheck,
    },
  ];

  const activityFeed = [
    {
      label: "Appeals closed",
      value: String(closedAppeals),
      time: "Current snapshot",
      icon: CheckCircle,
    },
    {
      label: "Tickets closed",
      value: String(closedTickets),
      time: "Current snapshot",
      icon: CheckCircle,
    },
    {
      label: "Pending queue items",
      value: String(totalQueueItems),
      time: "Backlog snapshot",
      icon: FileWarning,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Overview</h1>
          <p className="text-slate-600">
            Operational summary of admin queues, actions, and completion performance.
          </p>
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto justify-center gap-2">
            <Clock className="h-4 w-4" />
            Live Snapshot
          </Button>
          <Button className="w-full sm:w-auto justify-center gap-2 bg-blue-600 hover:bg-blue-700">
            <BarChart3 className="h-4 w-4" />
            Operations Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="bg-white rounded-lg border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">{metric.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {metric.value}
                  </p>
                </div>
                <Icon className="h-10 w-10 text-black" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Attention Required</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-slate-700" />
                <p className="text-sm font-medium text-slate-900">Open Appeals Queue</p>
              </div>
              <span className="text-sm font-semibold text-slate-800">{openAppeals}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <LifeBuoy className="h-4 w-4 text-slate-700" />
                <p className="text-sm font-medium text-slate-900">Open Support Queue</p>
              </div>
              <span className="text-sm font-semibold text-slate-800">{openTickets}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileWarning className="h-4 w-4 text-slate-700" />
                <p className="text-sm font-medium text-slate-900">Pending Reviews</p>
              </div>
              <span className="text-sm font-semibold text-slate-800">
                {pendingAppeals + pendingTickets}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Admin Performance Snapshot</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Appeals Completed</p>
              <span className="text-sm font-semibold text-slate-800">{closedAppeals}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Tickets Completed</p>
              <span className="text-sm font-semibold text-slate-800">{closedTickets}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Queue Backlog</p>
              <span className="text-sm font-semibold text-slate-800">{totalQueueItems}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Completion Rate</p>
              <span className="text-sm font-semibold text-slate-800">{completionRate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Operational Feed</h2>
        <div className="space-y-3">
          {activityFeed.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-md border border-slate-100 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-4 w-4 text-slate-700 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.time}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-800">{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
