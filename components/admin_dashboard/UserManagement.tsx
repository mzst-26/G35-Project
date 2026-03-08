"use client";

import React from "react";
import { useAdminUsers } from "@/hooks/useAdminUsers";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Users,
  Search,
  ChevronRight,
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
} from "lucide-react";

//import type { UsersFilterType } from "@/types/admin-users";
export type UsersFilterType = "all" | "trade" | "company";

const statusConfig = {
  active: {
    color: "bg-green-100 text-green-700",
    label: "Active",
    icon: CheckCircle,
  },
  suspended: {
    color: "bg-red-100 text-red-700",
    label: "Suspended",
    icon: Ban,
  },
  pending: {
    color: "bg-yellow-100 text-yellow-700",
    label: "Pending",
    icon: Shield,
  },
} as const;

export default function UserManagement({
  onSelectUser,
}: {
  onSelectUser: (userId: string) => void;
}): JSX.Element {
  const {
    filteredUsers,
    stats,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
  } = useAdminUsers(null);

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-2xl text-slate-900 mb-2 flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          User Management
        </h2>
        <p className="text-slate-600">
          Manage all platform users — companies and trades
        </p>
      </div>

      {/* Status line */}
      <div className="text-sm">
        {isLoading && <span className="text-slate-500">Loading…</span>}
        {error && <span className="text-red-600">Error: {error}</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Trade Professionals</p>
                <p className="text-xl text-slate-900">{stats.tradeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Companies</p>
                <p className="text-xl text-slate-900">{stats.companyCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active</p>
                <p className="text-xl text-slate-900">{stats.activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Suspended</p>
                <p className="text-xl text-slate-900">{stats.suspendedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs
          value={filterType}
          onValueChange={(value) => setFilterType(value as UsersFilterType)}
          className="w-full sm:w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="trade">Trades</TabsTrigger>
            <TabsTrigger value="company">Companies</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {!isLoading && filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-600">
                No users found matching your criteria
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => {
            const status = statusConfig[user.status];
            const StatusIcon = status.icon;

            return (
              <Card
                key={user.id}
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => onSelectUser(user.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`h-12 w-12 rounded-full flex items-center justify-center ${
                            user.type === "trade"
                              ? "bg-blue-100"
                              : "bg-green-100"
                          }`}
                        >
                          {user.type === "trade" ? (
                            <Briefcase className="h-6 w-6 text-blue-600" />
                          ) : (
                            <Building2 className="h-6 w-6 text-green-600" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-900">{user.name}</span>

                            {user.verified && (
                              <Badge className="bg-blue-100 text-blue-700">
                                <Shield className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}

                            <Badge className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>

                          <p className="text-xs text-slate-500">{user.id}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {user.email}
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {user.phone}
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {user.location}
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          Joined {user.joinDate}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-slate-700">
                            {user.rating ?? "—"}
                          </span>
                        </div>

                        {typeof user.completedJobs === "number" && (
                          <span className="text-slate-600">
                            {user.completedJobs} completed jobs
                          </span>
                        )}

                        {typeof user.postedJobs === "number" && (
                          <span className="text-slate-600">
                            {user.postedJobs} posted jobs
                          </span>
                        )}

                        {user.specialty && (
                          <Badge variant="outline" className="text-slate-600">
                            {user.specialty}
                          </Badge>
                        )}

                        {user.industry && (
                          <Badge variant="outline" className="text-slate-600">
                            {user.industry}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-slate-400 ml-4 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}