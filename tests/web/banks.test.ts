import { describe, expect, it } from "vitest";
import { THAI_BANKS } from "@/domain/recipients";
import { BANK_BRANDS, bankByCode, bankByLabel } from "@/web/banks";

describe("banks", () => {
  it("has one brand per server bank, with the same label", () => {
    expect(BANK_BRANDS.map((b) => [b.code, b.label])).toEqual(THAI_BANKS.map((b) => [b.code, b.label]));
  });
  it("finds a bank by the label the server sends", () => {
    expect(bankByLabel("Bangkok Bank")?.short).toBe("BBL");
    expect(bankByCode("SCB").label).toBe("SCB");
  });
  it("returns undefined for the seeded demo bank", () => {
    expect(bankByLabel("Demo Thai Bank")).toBeUndefined();
  });
});
