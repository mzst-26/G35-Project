import { InternalAuthError, ValidationError } from "../errors/index.js";
import { env } from "../config/env.js";

export interface UkCompanyLookupResult {
  companyName: string;
  companyNumber: string;
  addressLine1: string;
}

interface CompaniesHouseItem {
  title?: string;
  company_name?: string;
  company_number?: string;
  address_snippet?: string;
}

function getCompaniesHouseApiKey(): string {
  const key =
    process.env.COMPANIES_HOUSE_API_KEY
    ?? process.env.COMPANIES_HOUSE_REST_API_KEY
    ?? process.env.CH_API_KEY
    ?? env.COMPANIES_HOUSE_API_KEY
    ?? env.COMPANIES_HOUSE_REST_API_KEY
    ?? env.CH_API_KEY;
  if (!key) {
    throw new ValidationError("UK company lookup is not configured on identity service.", [
      { field: "COMPANIES_HOUSE_API_KEY", message: "Missing Companies House API key configuration." },
    ]);
  }
  return key;
}

export async function lookupUkCompanies(query: string): Promise<UkCompanyLookupResult[]> {
  const search = query.trim();
  if (search.length < 2) return [];

  const apiKey = getCompaniesHouseApiKey();
  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const url = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(search)}&items_per_page=10`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new InternalAuthError(new Error(`Companies House lookup failed with status ${response.status}`));
  }

  const data = (await response.json()) as { items?: CompaniesHouseItem[] };
  return (data.items ?? [])
    .map((item) => ({
      name: item.company_name ?? item.title,
      companyNumber: item.company_number,
      addressLine1: (item.address_snippet ?? "").split(",")[0]?.trim() ?? "",
    }))
    .filter((item) => item.name && item.companyNumber)
    .map((item) => ({
      companyName: item.name as string,
      companyNumber: item.companyNumber as string,
      addressLine1: item.addressLine1,
    }));
}
