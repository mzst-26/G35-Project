import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceUnavailableError } from "@infra/shared-errors";
import type {
  ListWorkersFilters,
  UpdateWorkerProfileInput,
  Worker,
  WorkerVerificationStatus,
} from "../domain/types.js";

type WorkerRow = {
  id: string;
  user_id: string;
  trade_id: string;
  qualifications: string | null;
  verified_status: WorkerVerificationStatus;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  location_lng: number | null;
  location_lat: number | null;
};

type WorkerProfileRow = {
  worker_id: string;
  bio: string | null;
  avatar_url: string | null;
  hourly_rate: number | null;
};

export interface WorkerRepository {
  findById(id: string): Promise<Worker | null>;
  updateProfile(id: string, input: UpdateWorkerProfileInput): Promise<Worker>;
  list(filters: ListWorkersFilters): Promise<{ data: Worker[]; total: number }>;
  updateVerificationStatus(id: string, status: WorkerVerificationStatus): Promise<Worker>;
}

function mapWorker(row: WorkerRow, profile?: WorkerProfileRow | null): Worker {
  return {
    id: row.id,
    userId: row.user_id,
    tradeId: row.trade_id,
    qualifications: row.qualifications,
    verifiedStatus: row.verified_status,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    locationLng: row.location_lng,
    locationLat: row.location_lat,
    bio: profile?.bio ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    hourlyRate: profile?.hourly_rate ?? null,
  };
}

export class SupabaseWorkerRepository implements WorkerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Worker | null> {
    const { data, error } = await this.client.from("workers").select("*").eq("id", id).maybeSingle();
    if (error) {
      throw new ServiceUnavailableError("Workers storage is unavailable.", error);
    }
    if (!data) {
      return null;
    }

    const profile = await this.fetchProfile(id);
    return mapWorker(data as WorkerRow, profile);
  }

  async updateProfile(id: string, input: UpdateWorkerProfileInput): Promise<Worker> {
    const workerPatch: Record<string, unknown> = {};
    if (input.qualifications !== undefined) workerPatch.qualifications = input.qualifications;
    if (input.addressLine1 !== undefined) workerPatch.address_line1 = input.addressLine1;
    if (input.addressLine2 !== undefined) workerPatch.address_line2 = input.addressLine2;
    if (input.city !== undefined) workerPatch.city = input.city;
    if (input.locationLng !== undefined) workerPatch.location_lng = input.locationLng;
    if (input.locationLat !== undefined) workerPatch.location_lat = input.locationLat;

    if (Object.keys(workerPatch).length > 0) {
      const { error } = await this.client.from("workers").update(workerPatch).eq("id", id);
      if (error) {
        throw new ServiceUnavailableError("Failed to update worker profile.", error);
      }
    }

    if (
      input.bio !== undefined ||
      input.avatarUrl !== undefined ||
      input.hourlyRate !== undefined
    ) {
      const { error } = await this.client.from("workers_profile").upsert(
        {
          worker_id: id,
          bio: input.bio ?? null,
          avatar_url: input.avatarUrl ?? null,
          hourly_rate: input.hourlyRate ?? null,
        },
        { onConflict: "worker_id" },
      );
      if (error) {
        throw new ServiceUnavailableError("Failed to update worker profile details.", error);
      }
    }

    const latest = await this.findById(id);
    if (!latest) {
      throw new ServiceUnavailableError("Worker was updated but cannot be reloaded.");
    }
    return latest;
  }

  async list(filters: ListWorkersFilters): Promise<{ data: Worker[]; total: number }> {
    let q = this.client.from("workers").select("*", { count: "exact" }).order("id", { ascending: true });
    if (filters.verifiedStatus) {
      q = q.eq("verified_status", filters.verifiedStatus);
    }
    const from = filters.offset;
    const to = filters.offset + filters.limit - 1;
    const { data, error, count } = await q.range(from, to);
    if (error) {
      throw new ServiceUnavailableError("Workers storage is unavailable.", error);
    }

    const rows = (data ?? []) as WorkerRow[];
    const ids = rows.map((row) => row.id);
    const profileMap = await this.fetchProfiles(ids);
    return {
      data: rows.map((row) => mapWorker(row, profileMap.get(row.id) ?? null)),
      total: count ?? rows.length,
    };
  }

  async updateVerificationStatus(id: string, status: WorkerVerificationStatus): Promise<Worker> {
    const { error } = await this.client
      .from("workers")
      .update({ verified_status: status })
      .eq("id", id);

    if (error) {
      throw new ServiceUnavailableError("Failed to update worker verification status.", error);
    }

    const latest = await this.findById(id);
    if (!latest) {
      throw new ServiceUnavailableError("Worker verification changed but cannot be reloaded.");
    }
    return latest;
  }

  private async fetchProfile(workerId: string): Promise<WorkerProfileRow | null> {
    const { data, error } = await this.client
      .from("workers_profile")
      .select("worker_id, bio, avatar_url, hourly_rate")
      .eq("worker_id", workerId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableError("Worker profile storage is unavailable.", error);
    }
    return (data as WorkerProfileRow | null) ?? null;
  }

  private async fetchProfiles(workerIds: string[]): Promise<Map<string, WorkerProfileRow>> {
    if (workerIds.length === 0) {
      return new Map();
    }
    const { data, error } = await this.client
      .from("workers_profile")
      .select("worker_id, bio, avatar_url, hourly_rate")
      .in("worker_id", workerIds);

    if (error) {
      throw new ServiceUnavailableError("Worker profile storage is unavailable.", error);
    }

    const map = new Map<string, WorkerProfileRow>();
    for (const row of (data ?? []) as WorkerProfileRow[]) {
      map.set(row.worker_id, row);
    }
    return map;
  }
}
