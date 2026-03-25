import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceUnavailableError } from "@infra/shared-errors";
import type {
  Company,
  CompanyStatus,
  ListCompaniesFilters,
  UpdateCompanyProfileInput,
} from "../domain/company/company.types.js";

type CompanyRow = {
  id: string;
  user_id: string;
  company_name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  account_status: CompanyStatus;
  status_changed_at: string | null;
  status_changed_by: string | null;
  status_reason: string | null;
};

type CompanyProfileRow = {
  company_id: string;
  bio: string | null;
  logo_url: string | null;
  website: string | null;
};

export interface CompanyRepository {
  findById(id: string): Promise<Company | null>;
  updateProfile(id: string, input: UpdateCompanyProfileInput): Promise<Company>;
  list(filters: ListCompaniesFilters): Promise<{ data: Company[]; total: number }>;
  updateStatus(id: string, status: CompanyStatus, actorId: string, reason?: string): Promise<Company>;
}

function mapCompany(row: CompanyRow, profile?: CompanyProfileRow | null): Company {
  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    postcode: row.postcode,
    accountStatus: row.account_status,
    statusChangedAt: row.status_changed_at,
    statusChangedBy: row.status_changed_by,
    statusReason: row.status_reason,
    bio: profile?.bio ?? null,
    logoUrl: profile?.logo_url ?? null,
    website: profile?.website ?? null,
  };
}

export class SupabaseCompanyRepository implements CompanyRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Company | null> {
    const { data, error } = await this.client.from("companies").select("*").eq("id", id).maybeSingle();
    if (error) {
      throw new ServiceUnavailableError("Companies storage is unavailable.", error);
    }
    if (!data) {
      return null;
    }

    const profile = await this.fetchProfile(id);
    return mapCompany(data as CompanyRow, profile);
  }

  async updateProfile(id: string, input: UpdateCompanyProfileInput): Promise<Company> {
    const companyPatch: Record<string, unknown> = {};
    if (input.companyName !== undefined) companyPatch.company_name = input.companyName;
    if (input.addressLine1 !== undefined) companyPatch.address_line1 = input.addressLine1;
    if (input.addressLine2 !== undefined) companyPatch.address_line2 = input.addressLine2;
    if (input.city !== undefined) companyPatch.city = input.city;
    if (input.postcode !== undefined) companyPatch.postcode = input.postcode;

    if (Object.keys(companyPatch).length > 0) {
      const { error } = await this.client.from("companies").update(companyPatch).eq("id", id);
      if (error) {
        throw new ServiceUnavailableError("Failed to update company profile.", error);
      }
    }

    if (
      input.bio !== undefined ||
      input.logoUrl !== undefined ||
      input.website !== undefined
    ) {
      const { error } = await this.client.from("companies_profile").upsert(
        {
          company_id: id,
          bio: input.bio ?? null,
          logo_url: input.logoUrl ?? null,
          website: input.website ?? null,
        },
        { onConflict: "company_id" },
      );
      if (error) {
        throw new ServiceUnavailableError("Failed to update company profile details.", error);
      }
    }

    const latest = await this.findById(id);
    if (!latest) {
      throw new ServiceUnavailableError("Company was updated but cannot be reloaded.");
    }
    return latest;
  }

  async list(filters: ListCompaniesFilters): Promise<{ data: Company[]; total: number }> {
    let q = this.client.from("companies").select("*", { count: "exact" }).order("company_name", { ascending: true });
    if (filters.status) {
      q = q.eq("account_status", filters.status);
    }
    const from = filters.offset;
    const to = filters.offset + filters.limit - 1;
    const { data, error, count } = await q.range(from, to);
    if (error) {
      throw new ServiceUnavailableError("Companies storage is unavailable.", error);
    }

    const rows = (data ?? []) as CompanyRow[];
    const ids = rows.map((row) => row.id);
    const profileMap = await this.fetchProfiles(ids);
    return {
      data: rows.map((row) => mapCompany(row, profileMap.get(row.id) ?? null)),
      total: count ?? rows.length,
    };
  }

  async updateStatus(id: string, status: CompanyStatus, actorId: string, reason?: string): Promise<Company> {
    const { error } = await this.client
      .from("companies")
      .update({
        account_status: status,
        status_changed_at: new Date().toISOString(),
        status_changed_by: actorId,
        status_reason: reason ?? null,
      })
      .eq("id", id);

    if (error) {
      throw new ServiceUnavailableError("Failed to update company status.", error);
    }

    const latest = await this.findById(id);
    if (!latest) {
      throw new ServiceUnavailableError("Company status changed but cannot be reloaded.");
    }
    return latest;
  }

  private async fetchProfile(companyId: string): Promise<CompanyProfileRow | null> {
    const { data, error } = await this.client
      .from("companies_profile")
      .select("company_id, bio, logo_url, website")
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableError("Company profile storage is unavailable.", error);
    }
    return (data as CompanyProfileRow | null) ?? null;
  }

  private async fetchProfiles(companyIds: string[]): Promise<Map<string, CompanyProfileRow>> {
    if (companyIds.length === 0) {
      return new Map();
    }
    const { data, error } = await this.client
      .from("companies_profile")
      .select("company_id, bio, logo_url, website")
      .in("company_id", companyIds);

    if (error) {
      throw new ServiceUnavailableError("Company profile storage is unavailable.", error);
    }

    const map = new Map<string, CompanyProfileRow>();
    for (const row of (data ?? []) as CompanyProfileRow[]) {
      map.set(row.company_id, row);
    }
    return map;
  }
}
