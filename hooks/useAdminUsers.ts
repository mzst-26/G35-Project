"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminUserDetail, AdminUserSummary } from "@/types/admin-users";
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

  const saveUser = useCallback(async (user: AdminUserDetail) => {
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
  }, [fetchList, fetchSelected]);

  const suspend = useCallback(async (userId: string, reason: string) => {
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
  }, [fetchList, fetchSelected]);

  const unsuspend = useCallback(async (userId: string) => {
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
  }, [fetchList, fetchSelected]);

  return {
    users,
    selectedUser,
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