"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminUserDetail, AdminUserSummary, UsersFilterType } from "@/types/admin-users";

import {
  getAdminUserById,
  listAdminUsers,
  suspendAdminUser,
  unsuspendAdminUser,
  updateAdminUser,
} from "@/services/adminUsersAPI";

export function useAdminUsers(selectedUserId: string | null) {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<UsersFilterType>("all");

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setIsLoadingList(true);
    setError(null);

    try {
      const data = await listAdminUsers();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const fetchSelected = useCallback(async () => {
    if (!selectedUserId) {
      setSelectedUser(null);
      return;
    }

    setIsLoadingUser(true);
    setError(null);

    try {
      const data = await getAdminUserById(selectedUserId);
      setSelectedUser(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoadingUser(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchSelected();
  }, [fetchSelected]);

  const saveUser = useCallback(
    async (user: AdminUserDetail) => {
      setIsSaving(true);
      setError(null);

      try {
        await updateAdminUser(user);
        await fetchList();
        await fetchSelected();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setIsSaving(false);
      }
    },
    [fetchList, fetchSelected],
  );

  const suspend = useCallback(
    async (userId: string, reason: string) => {
      setIsSaving(true);
      setError(null);

      try {
        await suspendAdminUser(userId, reason);
        await fetchList();
        await fetchSelected();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setIsSaving(false);
      }
    },
    [fetchList, fetchSelected],
  );

  const unsuspend = useCallback(
    async (userId: string) => {
      setIsSaving(true);
      setError(null);

      try {
        await unsuspendAdminUser(userId);
        await fetchList();
        await fetchSelected();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setIsSaving(false);
      }
    },
    [fetchList, fetchSelected],
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.id.toLowerCase().includes(q);

      const matchesType =
        filterType === "all" || user.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [users, searchQuery, filterType]);

  const stats = useMemo(() => {
    return {
      tradeCount: users.filter((u) => u.type === "trade").length,
      companyCount: users.filter((u) => u.type === "company").length,
      activeCount: users.filter((u) => u.status === "active").length,
      suspendedCount: users.filter((u) => u.status === "suspended").length,
    };
  }, [users]);

  return {
    users,
    selectedUser,

    searchQuery,
    setSearchQuery,

    filterType,
    setFilterType,

    filteredUsers,
    stats,

    isLoading: isLoadingList,
    isLoadingList,
    isLoadingUser,
    isSaving,

    error,

    refetchList: fetchList,
    refetchSelected: fetchSelected,

    saveUser,
    suspend,
    unsuspend,
  };
}