"use client";

import React, { useMemo, ReactElement } from "react";

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
import { PoundSterling } from "lucide-react";
import { Shield, Lock } from "lucide-react";
import { Clock } from "lucide-react";
import { Users } from "lucide-react";

export default function AdminSettings(): ReactElement {
  // TODO(core-platform-service): Provide an admin statistics endpoint so General tab
  // can replace placeholder stats with real values.
  const { settings, isLoading, isSaving, error, saveSuccess, save, actions } =
    useAdminSettings();

  // Keep General "read-only" look for now, using "—" if empty.
  const general = useMemo(() => {
    return {
      fullName: settings.general.fullName || "—",
      email: settings.general.email || "—",
      phoneNumber: settings.general.phoneNumber || "—",
      adminLevel: settings.general.adminLevel || "—",
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
                Admin Profile Information
              </CardTitle>
              <CardDescription>Profile data from database (read-only)</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="admin-full-name">Full Name</Label>
                  <Input
                    id="admin-full-name"
                    value={general.fullName}
                    disabled
                    className="bg-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    value={general.email}
                    disabled
                    className="bg-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-phone">Phone Number</Label>
                  <Input
                    id="admin-phone"
                    value={general.phoneNumber}
                    disabled
                    className="bg-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-level">Admin Level</Label>
                  <Input
                    id="admin-level"
                    value={general.adminLevel}
                    disabled
                    className="bg-slate-100"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Security policy: admin profile fields are read-only and synchronized from the database.
              </p>

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                Security Information
              </CardTitle>
              <CardDescription>
                Admin security and access information
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm text-slate-900 mb-1">
                      Admin Account Security
                    </h3>
                    <p className="text-sm text-slate-600">
                      Admin login credentials cannot be changed from this panel for security reasons.
                      Contact a system administrator for any account modifications.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-600">
                Future security controls (e.g., two-factor authentication, session timeout, IP allow-listing)
                will appear here once backend support is available.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PoundSterling className="h-5 w-5 text-green-600" />
                Payment &amp; Fee Settings
              </CardTitle>
              <CardDescription>
                Configure platform fees and penalty amounts
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Platform fee */}
              <div className="space-y-2">
                <Label htmlFor="platform-fee">Platform Fee (%)</Label>
                <Input
                  id="platform-fee"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 5.5"
                  value={settings.payments.platformFeePercent ?? ""}
                  onChange={(e) => actions.setPaymentsNumber("platformFeePercent", e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Commission taken from each job payment
                </p>
              </div>

              {/* Penalty fees */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm text-slate-900 mb-3">Penalty Fees (£)</h3>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="late-cancellation-fee">Late Cancellation</Label>
                    <Input
                      id="late-cancellation-fee"
                      type="number"
                      placeholder="e.g. 50"
                      value={settings.payments.lateCancellationFee ?? ""}
                      onChange={(e) => actions.setPaymentsNumber("lateCancellationFee", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="no-show-fee">No Show</Label>
                    <Input
                      id="no-show-fee"
                      type="number"
                      placeholder="e.g. 100"
                      value={settings.payments.noShowFee ?? ""}
                      onChange={(e) => actions.setPaymentsNumber("noShowFee", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="late-arrival-fee">Late Arrival</Label>
                    <Input
                      id="late-arrival-fee"
                      type="number"
                      placeholder="e.g. 30"
                      value={settings.payments.lateArrivalFee ?? ""}
                      onChange={(e) => actions.setPaymentsNumber("lateArrivalFee", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Job Management Settings
              </CardTitle>
              <CardDescription>
                Configure job allocation and management rules
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="max-jobs-per-trade">Max Jobs Per Trade</Label>
                  <Input
                    id="max-jobs-per-trade"
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 10"
                    value={settings.jobs.maxJobsPerTrade ?? ""}
                    onChange={(e) => actions.setJobsNumber("maxJobsPerTrade", e.target.value)}
                    disabled={isLoading || isSaving}
                  />
                  <p className="text-xs text-slate-500">
                    Maximum concurrent jobs per trade professional
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job-cancellation-window-hours">
                    Cancellation Window (hours)
                  </Label>
                  <Input
                    id="job-cancellation-window-hours"
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 24"
                    value={settings.jobs.jobCancellationWindowHours ?? ""}
                    onChange={(e) =>
                      actions.setJobsNumber("jobCancellationWindowHours", e.target.value)
                    }
                    disabled={isLoading || isSaving}
                  />
                  <p className="text-xs text-slate-500">
                    Minimum notice required for penalty-free cancellation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                User Management Settings
              </CardTitle>
              <CardDescription>
                Configure automatic user moderation rules
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="auto-suspension-threshold">
                  Auto-Suspension Threshold
                </Label>
                <Input
                  id="auto-suspension-threshold"
                  type="number"
                  placeholder="—"
                  value={settings.users.autoSuspensionThreshold ?? ""}
                  onChange={(e) =>
                    actions.setUsersNumber(
                      "autoSuspensionThreshold",
                      e.target.value
                    )
                  }
                />
                <p className="text-xs text-slate-500">
                  Number of active penalties before a user is automatically suspended
                </p>
              </div>
            </CardContent>
          </Card>
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