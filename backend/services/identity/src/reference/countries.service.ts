import { InternalAuthError } from "../errors/index.js";

export interface CountryReferenceItem {
  countryName: string;
  countryCode: string;
  callingCode: string | null;
}

interface RestCountriesItem {
  cca2?: string;
  name?: {
    common?: string;
  };
  idd?: {
    root?: string;
    suffixes?: string[];
  };
}

function buildCallingCode(idd?: RestCountriesItem["idd"]): string | null {
  if (!idd?.root) return null;
  const suffix = idd.suffixes?.[0] ?? "";
  const code = `${idd.root}${suffix}`.trim();
  return code.length > 0 ? code : null;
}

let cachedCountries: CountryReferenceItem[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function listReferenceCountries(): Promise<CountryReferenceItem[]> {
  if (cachedCountries && Date.now() < cacheExpiresAt) return cachedCountries;

  const response = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,idd", {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new InternalAuthError(new Error(`REST Countries lookup failed with status ${response.status}`));
  }

  const data = (await response.json()) as RestCountriesItem[];
  const result = data
    .map((item) => ({
      countryName: item.name?.common?.trim() ?? "",
      countryCode: (item.cca2 ?? "").toUpperCase(),
      callingCode: buildCallingCode(item.idd),
    }))
    .filter((item) => item.countryName.length > 0 && item.countryCode.length === 2)
    .sort((a, b) => a.countryName.localeCompare(b.countryName));

  cachedCountries = result;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return result;
}
