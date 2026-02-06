"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useAdminSettings from "@/hooks/useAdminSettings";
import useAdminNotifications from "@/hooks/useAdminNotifications";

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<"notifications" | "logout">(
    "notifications"
  );

  const { settings } = useAdminSettings();
  const { getNotifications, markRead } = useAdminNotifications();
  const notifications = getNotifications();

  return (
    <Card className="w-full">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-6 py-4 font-medium transition-colors ${
            activeTab === "notifications"
              ? "border-b-2 border-black text-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Notifications
        </button>
        <button
          onClick={() => setActiveTab("logout")}
          className={`px-6 py-4 font-medium transition-colors ${
            activeTab === "logout"
              ? "border-b-2 border-black text-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Log Out
        </button>
      </div>

      <div className="p-6">
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-slate-600">No notifications</p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((n: any) => (
                  <li
                    key={n.id}
                    className="flex items-center justify-between p-3 rounded-md border border-slate-200"
                  >
                    <span className="text-slate-700">{n.message}</span>
                    <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                      Mark read
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "logout" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Log Out</h3>
            <p className="text-slate-600">Sign out of the admin panel.</p>
            <div className="pt-4">
              <Button
                onClick={() => {
                  // placeholder logout behavior
                  window.location.href = "/logout";
                }}
              >
                Log Out
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 text-sm text-slate-500">
          <strong>Current site:</strong> {settings?.siteTitle ?? "—"}
        </div>
      </div>
    </Card>
  );
}
