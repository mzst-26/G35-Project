"use client";

import { TrendingUp, Users, AlertTriangle, Bug, BarChart3, Clock } from "lucide-react";
import { DashboardMetric } from "@/types/admin-dashboard";

export default function AnalyticsManagement(): React.JSX.Element {
  const metrics: DashboardMetric[] = [
    {
      label: "Daily Revenue",
      value: "$12,450",
      icon: TrendingUp,
    },
    {
      label: "Active Users",
      value: "582",
      icon: Users,
    },
    {
      label: "Average Downtime",
      value: "0.23h",
      icon: Clock,
    },
    {
      label: "Bug Log",
      value: "24",
      icon: Bug,
    },
    {
      label: "System Health",
      value: "98.5%",
      icon: BarChart3,
    },
    {
      label: "Critical Issues",
      value: "2",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-600">Platform analytics and reporting</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={index}
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
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-slate-600">Detailed analytics charts coming soon</p>
      </div>
    </div>
  );
}
