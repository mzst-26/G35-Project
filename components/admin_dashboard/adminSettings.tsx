"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

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

import {
  ArrowLeft,
  Settings,
  Save,
  Bell,
  Shield,
  DollarSign,
  Clock,
  Users,
} from "lucide-react";

import { useAdminSettings } from "@/hooks/useAdminSettings";

export default function AdminSettings(): JSX.Element {
  const router = useRouter();

  const goToSettings = (tab?: string) => {
  const url = tab ? `/admin/settings?tab=${tab}` : "/admin/settings";
  router.push(url);
};

  const { settings, actions, isLoading, isSaving, error, saveSuccess, save } = useAdminSettings();

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-2xl text-slate-900 mb-2 flex items-center gap-2">
                <Settings className="h-6 w-6 text-purple-600" />
                Admin Settings
              </h1>
              <p className="text-slate-600">
                Configure platform settings and preferences
              </p>
            </div>

            <Button
              onClick={save}
              className="bg-green-600 hover:bg-green-700"
              disabled={isSaving || isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* Minimal status line */}
          <div className="mt-2 text-sm">
            {isLoading && <span className="text-slate-500">Loading settings…</span>}
            {error && <span className="text-red-600">Error: {error}</span>}
            {saveSuccess && <span className="text-green-700">Saved successfully.</span>}
          </div>
        </div>

        {/* Tabs */}
        const searchParams = useSearchParams();
        const tab = searchParams.get("tab") ?? "general";

        <Tabs defaultValue={tab} className="space-y-6"></Tabs>
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
                  <Settings className="h-5 w-5 text-blue-600" />
                  General Platform Information
                </CardTitle>
                <CardDescription>Populate these from the server</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="platform-name">Platform Name</Label>
                    <Input
                      id="platform-name"
                      value={settings.general.platformName}
                      disabled
                      className="bg-slate-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platform-email">Platform Email</Label>
                    <Input
                      id="platform-email"
                      type="email"
                      value={settings.general.platformEmail}
                      disabled
                      className="bg-slate-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="support-email">Support Email</Label>
                    <Input
                      id="support-email"
                      type="email"
                      value={settings.general.supportEmail}
                      disabled
                      className="bg-slate-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={settings.general.timezone}
                      disabled
                      className="bg-slate-100"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm text-slate-900 mb-2">Platform Statistics</h3>
                  <p className="text-sm text-slate-500">
                    TODO: Render live statistics here (users, jobs, version, backup status).
                  </p>
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
                <CardDescription>Toggle admin notification types</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ToggleRow
                  id="email-notifications"
                  title="Email Notifications"
                  description="Receive notifications via email"
                  checked={settings.notifications.emailNotifications}
                  onCheckedChange={(v) => actions.setNotifications("emailNotifications", v)}
                />

                <ToggleRow
                  id="new-user-alerts"
                  title="New User Alerts"
                  description="Get notified when new users register"
                  checked={settings.notifications.newUserAlerts}
                  onCheckedChange={(v) => actions.setNotifications("newUserAlerts", v)}
                />

                <ToggleRow
                  id="appeal-alerts"
                  title="Appeal Alerts"
                  description="Receive notifications for new appeals"
                  checked={settings.notifications.appealAlerts}
                  onCheckedChange={(v) => actions.setNotifications("appealAlerts", v)}
                />

                <ToggleRow
                  id="support-ticket-alerts"
                  title="Support Ticket Alerts"
                  description="Get notified about new support tickets"
                  checked={settings.notifications.supportTicketAlerts}
                  onCheckedChange={(v) => actions.setNotifications("supportTicketAlerts", v)}
                />

                <ToggleRow
                  id="system-alerts"
                  title="System Alerts"
                  description="Critical system notifications"
                  checked={settings.notifications.systemAlerts}
                  onCheckedChange={(v) => actions.setNotifications("systemAlerts", v)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  Security
                </CardTitle>
                <CardDescription>Skeleton section for future work</CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-slate-600">
                  TODO: Add security settings (e.g., session timeout, IP allowlist, 2FA enforcement) and connect to API.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Payment &amp; Fee Settings
                </CardTitle>
                <CardDescription>Configure platform fees and penalty amounts</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="platform-fee">Platform Fee (%)</Label>
                  <Input
                    id="platform-fee"
                    type="number"
                    step="0.1"
                    value={settings.payments.platformFeePercent ?? ""}
                    onChange={(e) => actions.setPaymentsNumber("platformFeePercent", e.target.value)}
                  />
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm text-slate-900 mb-3">Penalty Fees (£)</h3>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="late-cancellation-fee">Late Cancellation</Label>
                      <Input
                        id="late-cancellation-fee"
                        type="number"
                        value={settings.payments.lateCancellationFee ?? ""}
                        onChange={(e) => actions.setPaymentsNumber("lateCancellationFee", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="no-show-fee">No Show</Label>
                      <Input
                        id="no-show-fee"
                        type="number"
                        value={settings.payments.noShowFee ?? ""}
                        onChange={(e) => actions.setPaymentsNumber("noShowFee", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="late-arrival-fee">Late Arrival</Label>
                      <Input
                        id="late-arrival-fee"
                        type="number"
                        value={settings.payments.lateArrivalFee ?? ""}
                        onChange={(e) => actions.setPaymentsNumber("lateArrivalFee", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs */}
          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Job Management Settings
                </CardTitle>
                <CardDescription>Rules for job allocation and cancellation</CardDescription>
              </CardHeader>

              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-jobs-per-trade">Max Jobs Per Trade</Label>
                  <Input
                    id="max-jobs-per-trade"
                    type="number"
                    value={settings.jobs.maxJobsPerTrade ?? ""}
                    onChange={(e) => actions.setJobsNumber("maxJobsPerTrade", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancellation-window">Cancellation Window (hours)</Label>
                  <Input
                    id="cancellation-window"
                    type="number"
                    value={settings.jobs.jobCancellationWindowHours ?? ""}
                    onChange={(e) => actions.setJobsNumber("jobCancellationWindowHours", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  User Management Settings
                </CardTitle>
                <CardDescription>Rules for suspensions and approvals</CardDescription>
              </CardHeader>

              <CardContent className="space-y-2">
                <Label htmlFor="suspension-threshold">Auto-Suspension Threshold</Label>
                <Input
                  id="suspension-threshold"
                  type="number"
                  value={settings.users.autoSuspensionThreshold ?? ""}
                  onChange={(e) => actions.setUsersNumber("autoSuspensionThreshold", e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  TODO: Define how penalties map to auto-suspension.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bottom Save Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={save}
            className="bg-green-600 hover:bg-green-700"
            size="lg"
            disabled={isSaving || isLoading}
          >
            <Save className="h-5 w-5 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
      <div className="flex-1">
        <Label htmlFor={id} className="text-slate-900">
          {title}
        </Label>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}