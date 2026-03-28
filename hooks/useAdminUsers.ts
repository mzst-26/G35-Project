import { useCallback, useEffect, useMemo, useState } from "react";
import { captureFrontendError } from "@/lib/monitoring/sentry";
import { coreGetJson } from "@/lib/core/client";
import { toHookApiError } from "@/lib/core/error-envelope";
import { User, UserType } from "@/types/admin-dashboard";

const MAX_PAGE_SIZE = 100;
const USERS_CACHE_TTL_MS = 60_000;

type UsersMeta = {
  total: number;
  limit: number;
  offset: number;
};

type UsersPaginationState = Record<UserType, UsersMeta>;

type UsersHookOptions = {
  autoLoad?: boolean;
};

type UsersResponsePayload = {
  data?: unknown;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
};

type UsersPageCacheEntry = {
  users: User[];
  meta: UsersMeta;
  updatedAt: number;
};

const usersPageCache = new Map<string, UsersPageCacheEntry>();
const usersInflight = new Map<string, Promise<UsersPageCacheEntry>>();

function cacheKey(type: UserType, limit: number, offset: number): string {
  return `${type}:${limit}:${offset}`;
}

function isFresh(updatedAt: number): boolean {
  return Date.now() - updatedAt < USERS_CACHE_TTL_MS;
}

type CompanyRecord = {
  id?: string;
  userId?: string;
  companyName?: string;
  accountStatus?: string;
  statusChangedAt?: string | null;
};

type WorkerRecord = {
  id?: string;
  userId?: string;
  tradeId?: string;
  verifiedStatus?: string;
};

function extractDataArray(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const root = payload as Record<string, unknown>;
  const direct = root.data;
  if (Array.isArray(direct)) {
    return direct.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  if (direct && typeof direct === "object") {
    const nested = (direct as Record<string, unknown>).items;
    if (Array.isArray(nested)) {
      return nested.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
    }
  }
  return [];
}

function mapCompany(record: CompanyRecord): User {
  const accountStatus = (record.accountStatus ?? "").toLowerCase();
  const suspended = accountStatus === "suspended" || accountStatus === "rejected";
  return {
    id: record.id ?? "",
    name: record.companyName ?? "Unnamed Company",
    email: record.userId ?? "",
    status: suspended ? "suspended" : "active",
    joinDate: record.statusChangedAt?.split("T")[0] ?? "—",
  };
}

function mapWorker(record: WorkerRecord): User {
  const verification = (record.verifiedStatus ?? "").toLowerCase();
  const suspended = verification === "suspended" || verification === "rejected";
  const tradeLabel = record.tradeId ? `Trade ${record.tradeId}` : "Trade User";
  return {
    id: record.id ?? "",
    name: tradeLabel,
    email: record.userId ?? "",
    status: suspended ? "suspended" : "active",
    joinDate: "—",
  };
}

function extractMeta(payload: unknown, fallback: UsersMeta): UsersMeta {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  const root = payload as UsersResponsePayload;
  const total = typeof root.meta?.total === "number" ? root.meta.total : fallback.total;
  const limit = typeof root.meta?.limit === "number" ? root.meta.limit : fallback.limit;
  const offset = typeof root.meta?.offset === "number" ? root.meta.offset : fallback.offset;

  return {
    total,
    limit,
    offset,
  };
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 25;
  const rounded = Math.floor(limit);
  return Math.max(1, Math.min(MAX_PAGE_SIZE, rounded));
}

function normalizeOffset(offset: number): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(0, Math.floor(offset));
}

export const useAdminUsers = (options: UsersHookOptions = {}) => {
  const autoLoad = options.autoLoad ?? true;
  const [usersByType, setUsersByType] = useState<Record<UserType, User[]>>({
    trade: [],
    company: [],
  });
  const [paginationByType, setPaginationByType] = useState<UsersPaginationState>({
    trade: { total: 0, limit: 25, offset: 0 },
    company: { total: 0, limit: 25, offset: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsersPage = useCallback(async (type: UserType, limit = 25, offset = 0) => {
    const safeLimit = normalizeLimit(limit);
    const safeOffset = normalizeOffset(offset);
    const key = cacheKey(type, safeLimit, safeOffset);

    const cached = usersPageCache.get(key);
    if (cached && isFresh(cached.updatedAt)) {
      setUsersByType((prev) => ({ ...prev, [type]: cached.users }));
      setPaginationByType((prev) => ({ ...prev, [type]: cached.meta }));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let pending = usersInflight.get(key);

      if (!pending) {
        pending = (async (): Promise<UsersPageCacheEntry> => {
          if (type === "company") {
            const payload = await coreGetJson<unknown>(
              "/api/core/admin/companies",
              "Unable to load company users right now.",
              "ADMIN_COMPANIES_LOAD_FAILED",
              { limit: safeLimit, offset: safeOffset },
            );

            const companies = extractDataArray(payload).map((item) => mapCompany(item as CompanyRecord));
            return {
              users: companies,
              meta: extractMeta(payload, { total: companies.length, limit: safeLimit, offset: safeOffset }),
              updatedAt: Date.now(),
            };
          }

          const payload = await coreGetJson<unknown>(
            "/api/core/admin/workers",
            "Unable to load trade users right now.",
            "ADMIN_WORKERS_LOAD_FAILED",
            { limit: safeLimit, offset: safeOffset },
          );

          const workers = extractDataArray(payload).map((item) => mapWorker(item as WorkerRecord));
          return {
            users: workers,
            meta: extractMeta(payload, { total: workers.length, limit: safeLimit, offset: safeOffset }),
            updatedAt: Date.now(),
          };
        })();
        usersInflight.set(key, pending);
      }

      const page = await pending;
      usersPageCache.set(key, page);
      usersInflight.delete(key);

      setUsersByType((prev) => ({ ...prev, [type]: page.users }));
      setPaginationByType((prev) => ({ ...prev, [type]: page.meta }));
    } catch (caughtError) {
      usersInflight.delete(key);
      const apiError = toHookApiError(
        caughtError,
        "Unable to load users right now.",
        "ADMIN_USERS_LOAD_FAILED",
      );
      if (apiError.envelope.status === 401) {
        setUsersByType({ trade: [], company: [] });
        setError("Admin session is missing or expired. Please sign in again.");
        return;
      }
      if (apiError.envelope.status === 403) {
        setUsersByType({ trade: [], company: [] });
        setError("You are signed in, but your account is not permitted to access admin user data. This is likely a backend permission or policy issue.");
        return;
      }
      captureFrontendError(apiError, {
        flow: "admin_users",
        endpoint: "/api/core/admin/companies,/api/core/admin/workers",
        action: "load",
        role: "admin",
      });
      setUsersByType({ trade: [], company: [] });
      setError(apiError.envelope.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    await Promise.all([
      loadUsersPage("company", 25, 0),
      loadUsersPage("trade", 25, 0),
    ]);
  }, [loadUsersPage]);

  useEffect(() => {
    if (!autoLoad) return;
    void loadUsers();
  }, [autoLoad, loadUsers]);

  const getUsersByType = useCallback(
    (type: UserType): User[] => usersByType[type] ?? [],
    [usersByType],
  );

  const getUserById = useCallback(
    (id: string, type: UserType): User | undefined => {
      return (usersByType[type] ?? []).find((user) => user.id === id);
    },
    [usersByType],
  );

  const allUsers = useMemo(() => [...usersByType.trade, ...usersByType.company], [usersByType]);

  const getActiveUsersCount = useCallback(
    (): number => allUsers.filter((user) => user.status === "active").length,
    [allUsers],
  );

  const getSuspendedUsersCount = useCallback(
    (): number => allUsers.filter((user) => user.status === "suspended").length,
    [allUsers],
  );

  const getTotalUsersCount = useCallback(
    (type: UserType): number => paginationByType[type]?.total ?? getUsersByType(type).length,
    [paginationByType, getUsersByType],
  );

  const getPagination = useCallback(
    (type: UserType): UsersMeta => paginationByType[type],
    [paginationByType],
  );

  return {
    isLoading,
    error,
    refetch: loadUsers,
    loadUsersPage,
    getPagination,
    getUsersByType,
    getUserById,
    getActiveUsersCount,
    getSuspendedUsersCount,
    getTotalUsersCount,
  };
};
