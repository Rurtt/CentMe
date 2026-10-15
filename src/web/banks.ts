import { THAI_BANKS, type BankCode } from "@/domain/recipients";

export type BankBrand = { code: BankCode; label: string; short: string; bg: string; fg: string };

// Monogram colors close to each bank's brand. Text color picked for contrast on the fill.
const STYLE: Record<BankCode, { short: string; bg: string; fg: string }> = {
  KBANK: { short: "K", bg: "#138F2D", fg: "#FFFFFF" },
  SCB: { short: "SCB", bg: "#4E2E7F", fg: "#FFFFFF" },
  BBL: { short: "BBL", bg: "#1E4598", fg: "#FFFFFF" },
  KTB: { short: "KTB", bg: "#1BA5E1", fg: "#0B2E4F" },
  BAY: { short: "BAY", bg: "#FEC43B", fg: "#4A3B2F" },
  TTB: { short: "ttb", bg: "#0050F0", fg: "#FFFFFF" },
  GSB: { short: "GSB", bg: "#EB198D", fg: "#FFFFFF" },
};

export const BANK_BRANDS: readonly BankBrand[] = THAI_BANKS.map((b) => ({ code: b.code, label: b.label, ...STYLE[b.code] }));

export function bankByCode(code: BankCode): BankBrand {
  return BANK_BRANDS.find((b) => b.code === code)!;
}

/** Recipients only carry `bankLabel`; unknown labels (the seeded demo bank) return undefined. */
export function bankByLabel(label: string): BankBrand | undefined {
  return BANK_BRANDS.find((b) => b.label === label);
}
