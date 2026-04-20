import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";

export type NormalizedPhone = {
  e164: string;
  national: string;
  country: string | null;
  /** Digits-only rendering suitable as a dedupe key, NO leading + */
  normalized: string;
};

/**
 * Parse and normalize a phone number. Defaults to US when no country is
 * detected, which matches the agency's primary market.
 */
export function normalizePhone(
  raw: string,
  defaultCountry: "US" | "IN" | string = "US",
): NormalizedPhone | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const parsed = parsePhoneNumberFromString(
    trimmed,
    defaultCountry as "US",
  );
  if (!parsed?.isValid()) return null;
  return {
    e164: parsed.number,                   // "+14155551234"
    national: parsed.formatNational(),
    country: parsed.country ?? null,
    normalized: parsed.number.replace(/[^0-9]/g, ""),
  };
}

export function isLikelyValidPhone(raw: string, defaultCountry = "US"): boolean {
  if (!raw?.trim()) return false;
  try {
    return isValidPhoneNumber(raw, defaultCountry as "US");
  } catch {
    return false;
  }
}
