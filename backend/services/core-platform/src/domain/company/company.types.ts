export type CompanyStatus = "pending" | "approved" | "rejected" | "suspended";

export type Company = {
  id: string;
  userId: string;
  companyName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  accountStatus: CompanyStatus;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  statusReason: string | null;
  bio: string | null;
  logoUrl: string | null;
  website: string | null;
};

export type UpdateCompanyProfileInput = {
  companyName?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  bio?: string | null;
  logoUrl?: string | null;
  website?: string | null;
};

export type UpdateCompanyStatusInput = {
  status: CompanyStatus;
  reason?: string;
};

export type ListCompaniesFilters = {
  status?: CompanyStatus;
  limit: number;
  offset: number;
};
