"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { AdminUserDetail } from "@/types/admin-users";
import { useAdminUsers } from "@/hooks/useAdminUsers";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Edit,
  Save,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Briefcase,
  Building2,
  Shield,
  Ban,
  CheckCircle,
  PoundSterling,
  AlertTriangle,
  Activity,
  User as UserIcon,
} from "lucide-react";

export default function UserDetailView({
  userId,
  onBackToList,
}: {
  userId: string;
  onBackToList: () => void;
}): JSX.Element {
  const { selectedUser, isLoadingUser, isSaving, error, saveUser, suspend, unsuspend } =
    useAdminUsers(userId);

  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<AdminUserDetail | null>(null);

  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");

  useEffect(() => {
    setIsEditing(false);
    setShowSuspendDialog(false);
    setSuspensionReason("");
    setEditedUser(selectedUser ? structuredClone(selectedUser) : null);
  }, [selectedUser]);

  const financialTotal = useMemo(() => {
    if (!selectedUser) return null;
    return selectedUser.type === "trade"
      ? selectedUser.totalEarnings ?? null
      : selectedUser.totalSpent ?? null;
  }, [selectedUser]);

  if (isLoadingUser) {
    return (
      <Card>
        <CardContent className="py-10 text-slate-600">Loading user…</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-6 text-red-700">Error: {error}</CardContent>
      </Card>
    );
  }

  if (!selectedUser) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <UserIcon className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-600">User not found</p>
          <div className="mt-4">
            <Button variant="outline" onClick={onBackToList}>
              Back to Users
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const user = selectedUser;

  const handleSave = async () => {
    if (!editedUser) return;
    await saveUser(editedUser);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedUser(structuredClone(user));
    setIsEditing(false);
  };

  const handleSuspend = async () => {
    if (!suspensionReason.trim()) return;
    await suspend(user.id, suspensionReason.trim());
    setShowSuspendDialog(false);
    setSuspensionReason("");
  };

  const handleUnsuspend = async () => {
    await unsuspend(user.id);
  };

  return (
    <div className="space-y-6">
      {/* Section header (no Back to Dashboard button) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-16 w-16 rounded-xl flex items-center justify-center ${
              user.type === "trade" ? "bg-blue-100" : "bg-green-100"
            }`}
          >
            {user.type === "trade" ? (
              <Briefcase className="h-8 w-8 text-blue-600" />
            ) : (
              <Building2 className="h-8 w-8 text-green-600" />
            )}
          </div>

          <div>
            <h2 className="text-2xl text-slate-900 flex items-center gap-2">
              {user.name}
              {user.verified && (
                <Badge className="bg-blue-100 text-blue-700">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              <Badge
                className={
                  user.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }
              >
                {user.status === "active" ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" /> Active
                  </>
                ) : (
                  <>
                    <Ban className="h-3 w-3 mr-1" /> Suspended
                  </>
                )}
              </Badge>
            </h2>
            <p className="text-sm text-slate-500">{user.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBackToList}>
            Back to Users
          </Button>

          {isEditing ? (
            <>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving…" : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Details
              </Button>

              {user.status === "active" ? (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => setShowSuspendDialog(true)}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend User
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  onClick={handleUnsuspend}
                  disabled={isSaving}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Unsuspend User
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Suspension warning stays, but no animations */}
      {user.status === "suspended" && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-900 mb-1">This user is currently suspended</p>
                {user.suspensionReason && (
                  <p className="text-sm text-red-700">
                    <strong>Reason:</strong> {user.suspensionReason}
                  </p>
                )}
                {user.suspensionDate && (
                  <p className="text-xs text-red-600 mt-1">Suspended on: {user.suspensionDate}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats overview (kept, but uses £ icon) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">
                  {user.type === "trade" ? "Completed" : "Posted"} Jobs
                </p>
                <p className="text-xl text-slate-900">
                  {user.type === "trade" ? user.completedJobs ?? "—" : user.postedJobs ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Rating</p>
                <p className="text-xl text-slate-900">{user.rating ?? "—"} ★</p>
                <p className="text-xs text-slate-500">{user.totalReviews ?? "—"} reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <PoundSterling className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">{user.type === "trade" ? "Earnings" : "Spent"}</p>
                <p className="text-xl text-slate-900">
                  {financialTotal === null ? "—" : `£${financialTotal.toLocaleString()}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  (user.activePenalties ?? 0) > 0 ? "bg-red-100" : "bg-slate-100"
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${
                    (user.activePenalties ?? 0) > 0 ? "text-red-600" : "text-slate-400"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-slate-600">Penalties</p>
                <p className="text-xl text-slate-900">{user.activePenalties ?? "—"}</p>
                <p className="text-xs text-slate-500">{user.totalPenalties ?? "—"} total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - keep layout, but skeleton-friendly */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          {user.type === "trade" && <TabsTrigger value="skills">Skills</TabsTrigger>}
          {user.type === "company" && <TabsTrigger value="company">Company Info</TabsTrigger>}
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Personal and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Field
                  label="Full Name"
                  icon={<UserIcon className="h-4 w-4 text-slate-400" />}
                  editing={isEditing}
                  value={editedUser?.name ?? ""}
                  display={user.name || "—"}
                  onChange={(v) => setEditedUser((p) => (p ? { ...p, name: v } : p))}
                />

                <Field
                  label="Email"
                  icon={<Mail className="h-4 w-4 text-slate-400" />}
                  editing={isEditing}
                  value={editedUser?.email ?? ""}
                  display={user.email || "—"}
                  onChange={(v) => setEditedUser((p) => (p ? { ...p, email: v } : p))}
                />

                <Field
                  label="Phone"
                  icon={<Phone className="h-4 w-4 text-slate-400" />}
                  editing={isEditing}
                  value={editedUser?.phone ?? ""}
                  display={user.phone || "—"}
                  onChange={(v) => setEditedUser((p) => (p ? { ...p, phone: v } : p))}
                />

                <Field
                  label="Location"
                  icon={<MapPin className="h-4 w-4 text-slate-400" />}
                  editing={isEditing}
                  value={editedUser?.location ?? ""}
                  display={user.location || "—"}
                  onChange={(v) => setEditedUser((p) => (p ? { ...p, location: v } : p))}
                />

                <div className="space-y-2 md:col-span-2">
                  <Label>Full Address</Label>
                  {isEditing ? (
                    <Input
                      value={editedUser?.address ?? ""}
                      onChange={(e) => setEditedUser((p) => (p ? { ...p, address: e.target.value } : p))}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-900">{user.address || "—"}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Join Date</Label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-900">{user.joinDate || "—"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{user.type === "trade" ? "Specialty" : "Industry"}</Label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-900">
                      {user.type === "trade" ? user.specialty || "—" : user.industry || "—"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Bio</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedUser?.bio ?? ""}
                      onChange={(e) => setEditedUser((p) => (p ? { ...p, bio: e.target.value } : p))}
                      rows={3}
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-slate-900 text-sm">{user.bio || "—"}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest actions and events</CardDescription>
            </CardHeader>
            <CardContent>
              {user.recentActivity.length === 0 ? (
                <p className="text-slate-600">No activity available.</p>
              ) : (
                <div className="space-y-3">
                  {user.recentActivity.map((a, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-slate-200" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-900">{a.action}</p>
                        <p className="text-xs text-slate-500">{a.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {user.type === "trade" && (
          <TabsContent value="skills">
            <Card>
              <CardHeader>
                <CardTitle>Skills &amp; Expertise</CardTitle>
                <CardDescription>Trade skills and certifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-600">Skills</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(user.skills ?? []).length === 0 ? (
                      <span className="text-slate-600">—</span>
                    ) : (
                      user.skills!.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-slate-600">
                          {s}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-600">Certifications</Label>
                  <div className="mt-2 space-y-2">
                    {(user.certifications ?? []).length === 0 ? (
                      <span className="text-slate-600">—</span>
                    ) : (
                      user.certifications!.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-slate-900 text-sm">{c}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {user.type === "company" && (
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-600" />
                  Company Information
                </CardTitle>
                <CardDescription>Business details and registration</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                <InfoRow label="Company Size" value={user.companySize} />
                <InfoRow label="Industry" value={user.industry} />
                <InfoRow label="Registration Number" value={user.registrationNumber} mono />
                <InfoRow label="VAT Number" value={user.vatNumber} mono />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Suspend dialog (kept, no motion) */}
      {showSuspendDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg text-slate-900 mb-1">Suspend User</h3>
                <p className="text-sm text-slate-600">
                  Are you sure you want to suspend {user.name}? They will not be able to access the platform.
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <Label>Suspension Reason *</Label>
              <Textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Provide a reason for suspension…"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSuspend}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={!suspensionReason.trim() || isSaving}
              >
                <Ban className="h-4 w-4 mr-2" />
                Suspend User
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuspendDialog(false);
                  setSuspensionReason("");
                }}
                className="flex-1"
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  icon,
  editing,
  value,
  display,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  editing: boolean;
  value: string;
  display: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {editing ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
          {icon}
          <span className="text-slate-900">{display}</span>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      <p className={`text-slate-900 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}