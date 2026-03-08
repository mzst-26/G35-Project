"use client";

import { useState } from "react";
import { Users, Briefcase, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserListView from "./UserListView";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { DashboardMetric } from "@/types/admin-dashboard";

type UsersView = "overview" | "trade" | "company";

export default function UsersManagement(): React.JSX.Element {
  const [activeView, setActiveView] = useState<UsersView>("overview");
  const { getActiveUsersCount, getSuspendedUsersCount } = useAdminUsers();

  const metrics: DashboardMetric[] = [
    {
      label: "Total Trade Users",
      value: "1,245",
      icon: Users,
    },
    {
      label: "Total Company Users",
      value: "892",
      icon: Briefcase,
    },
    {
      label: "Active Total Users",
      value: "582",
      icon: CheckCircle,
    },
    {
      label: "Suspended Users",
      value: "24",
      icon: AlertCircle,
    },
  ];

  if (activeView === "trade") {
    return (
      <UserListView
        listType="trade"
        onBack={() => setActiveView("overview")}
      />
    );
  }

  if (activeView === "company") {
    return (
      <UserListView
        listType="company"
        onBack={() => setActiveView("overview")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-600">Manage all platform users</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="flex gap-4">
        <Button
          className="bg-black text-white hover:bg-gray-900"
          onClick={() => setActiveView("trade")}
        >
          Trade List
        </Button>
        <Button
          className="bg-black text-white hover:bg-gray-900"
          onClick={() => setActiveView("company")}
        >
          Company List
        </Button>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-slate-600">
          Additional user management features coming soon
        </p>
      </div>
    </div>
  );
}
