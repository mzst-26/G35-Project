import type { Company } from "../domain/types.js";

export function companyToJson(company: Company) {
  return {
    id: company.id,
    userId: company.userId,
    companyName: company.companyName,
    addressLine1: company.addressLine1,
    addressLine2: company.addressLine2,
    city: company.city,
    postcode: company.postcode,
    accountStatus: company.accountStatus,
    statusChangedAt: company.statusChangedAt,
    statusChangedBy: company.statusChangedBy,
    statusReason: company.statusReason,
    bio: company.bio,
    logoUrl: company.logoUrl,
    website: company.website,
  };
}
