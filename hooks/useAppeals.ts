import { useCallback, useEffect, useMemo, useState } from "react";
import { coreGetJson } from "@/lib/core/client";
import { toHookApiError } from "@/lib/core/error-envelope";
import { captureFrontendError } from "@/lib/monitoring/sentry";
import { Appeal, AppealStatus } from "@/types/admin-dashboard";

// TODO(payments-penalties-service): Replace this temporary penalties-to-appeals mapping
// with a dedicated appeals endpoint once the Payments & Penalties Service exposes it.

type PenaltyRecord = {
  id?: string;
  reason?: string;
  description?: string;
  date?: string;
  createdAt?: string;
  status?: string;
  referenceJob?: string;
};

const APPEALS_CACHE_TTL_MS = 60_000;
let appealsCache: { data: Appeal[]; updatedAt: number } | null = null;
let appealsInflight: Promise<Appeal[]> | null = null;
const ENABLE_APPEALS_CACHE = process.env.NODE_ENV !== "test";

function extractDataArray(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.data)) {
    return root.data.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  return [];
}

function mapPenaltyStatus(status: string | undefined): AppealStatus {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "paid") return "closed";
  if (normalized === "disputed") return "pending";
  return "open";
}

function mapPenalty(record: PenaltyRecord): Appeal {
  const dateSource = record.date ?? record.createdAt ?? "";
  return {
    id: record.id ?? "",
    userName: record.referenceJob ?? "Trade user",
    reason: record.reason ?? record.description ?? "Appeal",
    date: dateSource.includes("T") ? dateSource.split("T")[0] : dateSource || "—",
    status: mapPenaltyStatus(record.status),
  };
}

export const useAppeals = () => {
  const [appeals, setAppeals] = useState<Appeal[]>(ENABLE_APPEALS_CACHE ? (appealsCache?.data ?? []) : []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppeals = useCallback(async () => {
    if (ENABLE_APPEALS_CACHE && appealsCache && Date.now() - appealsCache.updatedAt < APPEALS_CACHE_TTL_MS) {
      setAppeals(appealsCache.data);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!appealsInflight || !ENABLE_APPEALS_CACHE) {
        appealsInflight = (async () => {
          // TODO(payments-penalties-service): `/api/core/penalties` is a temporary source for appeals.
          const payload = await coreGetJson<unknown>(
            "/api/core/penalties",
            "Unable to load appeals right now.",
            "ADMIN_APPEALS_LOAD_FAILED",
          );
          return extractDataArray(payload).map((item) => mapPenalty(item as PenaltyRecord));
        })();
      }

      const list = await appealsInflight;
      if (ENABLE_APPEALS_CACHE) {
        appealsCache = { data: list, updatedAt: Date.now() };
      }
      setAppeals(list);
    } catch (caughtError) {
      const apiError = toHookApiError(
        caughtError,
        "Unable to load appeals right now.",
        "ADMIN_APPEALS_LOAD_FAILED",
      );
      if (apiError.envelope.status === 401) {
        setAppeals([]);
        setError("Admin session is missing or expired. Please sign in again.");
        return;
      }
      if (apiError.envelope.status === 403) {
        setAppeals([]);
        setError("You are signed in, but your account is not permitted to access appeals data. This is likely a backend permission or policy issue.");
        return;
      }
      captureFrontendError(apiError, {
        flow: "admin_appeals",
        endpoint: "/api/core/penalties",
        action: "load",
        role: "admin",
      });
      setAppeals([]);
      setError(apiError.envelope.message);
    } finally {
      if (ENABLE_APPEALS_CACHE) {
        appealsInflight = null;
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppeals();
  }, [loadAppeals]);

  const getAppealsCount = useCallback(
    (status: AppealStatus): number => appeals.filter((appeal) => appeal.status === status).length,
    [appeals],
  );

  const getFilteredAppeals = useCallback(
    (status: AppealStatus): Appeal[] => appeals.filter((appeal) => appeal.status === status),
    [appeals],
  );

  const getAppealById = useCallback(
    (id: string): Appeal | undefined => appeals.find((appeal) => appeal.id === id),
    [appeals],
  );

  const hasData = useMemo(() => appeals.length > 0, [appeals.length]);

  return {
    isLoading,
    error,
    hasData,
    refetch: loadAppeals,
    appeals,
    getAppealsCount,
    getFilteredAppeals,
    getAppealById,
  };
};
