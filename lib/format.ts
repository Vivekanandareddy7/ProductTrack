const CURRENCY_LOCALES: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  "₹": "INR",
  RS: "INR",
  "RS.": "INR",
  "₹.": "INR",
  $: "USD",
  "€": "EUR",
  "£": "GBP",
};

export function normalizeCurrency(
  currency: string | null | undefined,
): string {
  if (!currency) return "INR";
  const raw = currency.trim();
  if (!raw) return "INR";
  const upper = raw.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) {
    try {
      // Validate against Intl — malformed codes throw RangeError.
      new Intl.NumberFormat("en-US", { style: "currency", currency: upper });
      return upper;
    } catch {
      return "INR";
    }
  }
  const mapped = CURRENCY_SYMBOL_MAP[raw] ?? CURRENCY_SYMBOL_MAP[upper];
  if (mapped) return mapped;
  return "INR";
}

export function localeForCurrency(currency: string | null | undefined): string {
  return CURRENCY_LOCALES[normalizeCurrency(currency)] ?? "en-IN";
}

export function formatPrice(
  currency: string | null | undefined,
  amount: number | string | null | undefined,
): string {
  const cur = normalizeCurrency(currency);
  const value =
    typeof amount === "string" ? parseFloat(amount) : (amount ?? NaN);

  if (!Number.isFinite(value)) return "—";

  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[cur] ?? "en-IN", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch {
    return `${cur} ${value}`;
  }
}
