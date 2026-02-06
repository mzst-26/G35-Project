"use client";

import React, { useMemo } from "react";

import { useAdminSettings } from "@/hooks/useAdminSettings";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Settings, Save, Globe, Bell } from "lucide-react";

export default function AdminSettings(): JSX.Element {
  const { settings, isLoading, isSaving, error, saveSuccess, save, actions } =
    useAdminSettings();

  // Keep General "read-only" look for now, using "—" if empty.
  const general = useMemo(() => {
    return {
      platformName: settings.general.platformName || "—",
      platformEmail: settings.general.platformEmail || "—",
      supportEmail: settings.general.supportEmail || "—",
      timezone: settings.general.timezone || "—",
    };
  }, [settings.general]);

  return (
    <div className="space-y-6">
      {/* Header (section header, NOT page header) */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 mb-2 flex items-center gap-2">
            <Settings className="h-6 w-6 text-purple-600" />
            Admin Settings
          </h2>
          <p className="text-slate-600">
            Configure platform settings and preferences
          </p>
        </div>

        <Button
          onClick={save}
          className="bg-green-600 hover:bg-green-700"
          disabled={isLoading || isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      {/* Small status line */}
      <div className="text-sm">
        {isLoading && <span className="text-slate-500">Loading…</span>}
        {error && <span className="text-red-600">Error: {error}</span>}
        {saveSuccess && <span className="text-green-700">Saved.</span>}
      </div>

      {/* Tabs (slider row) */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                General Platform Information
              </CardTitle>
              <CardDescription>View platform details and statistics</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <Input
                    id="platform-name"
                    value={general.platformName}
                    disabled
                    className="bg-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform-email">Platform Email</Label>
                  <Input
                    id="platform-email"
                    value={general.platformEmail}
                    disabled
                    className="bg-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input
                    id="support-email"
                    value={general.supportEmail}
                    disabled
                    className="bg-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={general.timezone}
                    disabled
                    className="bg-slate-100"
                  />
                </div>
              </div>

              {/* Skeleton stats (no example numbers) */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm text-slate-900 mb-3">
                  Platform Statistics
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Total Users</span>
                    <span className="text-slate-900">—</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Active Jobs</span>
                    <span className="text-slate-900">—</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Platform Version</span>
                    <span className="text-slate-900">—</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Last Backup</span>
                    <span className="text-slate-900">—</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure admin notification settings
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <ToggleRow
                title="Email Notifications"
                description="Receive notifications via email"
                checked={settings.notifications.emailNotifications}
                onChange={(v) => actions.setNotifications("emailNotifications", v)}
              />

              <ToggleRow
                title="New User Alerts"
                description="Get notified when new users register"
                checked={settings.notifications.newUserAlerts}
                onChange={(v) => actions.setNotifications("newUserAlerts", v)}
              />

              <ToggleRow
                title="Appeal Alerts"
                description="Receive notifications for new appeals"
                checked={settings.notifications.appealAlerts}
                onChange={(v) => actions.setNotifications("appealAlerts", v)}
              />

              <ToggleRow
                title="Support Ticket Alerts"
                description="Get notified about new support tickets"
                checked={settings.notifications.supportTicketAlerts}
                onChange={(v) =>
                  actions.setNotifications("supportTicketAlerts", v)
                }
              />

              <ToggleRow
                title="System Alerts"
                description="Critical system notifications"
                checked={settings.notifications.systemAlerts}
                onChange={(v) => actions.setNotifications("systemAlerts", v)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Placeholders */}
        <TabsContent value="security">
          <PlaceholderCard title="Security" text="This is the security section." />
        </TabsContent>

        <TabsContent value="payments">
          <PlaceholderCard title="Payments" text="This is the payments section." />
        </TabsContent>

        <TabsContent value="jobs">
          <PlaceholderCard title="Jobs" text="This is the jobs section." />
        </TabsContent>

        <TabsContent value="users">
          <PlaceholderCard title="Users" text="This is the users section." />
        </TabsContent>
      </Tabs>

      {/* Bottom Save Button (matches your design) */}
      <div className="flex justify-end">
        <Button
          onClick={save}
          className="bg-green-600 hover:bg-green-700"
          size="lg"
          disabled={isLoading || isSaving}
        >
          <Save className="h-5 w-5 mr-2" />
          {isSaving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
      <div className="flex-1 pr-4">
        <Label className="text-slate-900">{title}</Label>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function PlaceholderCard({ title, text }: { title: string; text: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Placeholder</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600">{text}</p>
      </CardContent>
    </Card>
  );
}