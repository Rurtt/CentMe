import { describe, expect, it } from "vitest";
import { sanitizeAccountInput, formatCountdown, initials, maskAccount, shortHash } from "@/web/format";

describe("format", () => {
  it("masks the account to the last four characters", () => {
    expect(maskAccount("TEST ACCOUNT 0001")).toBe("••0001");
  });
  it("shortens long hashes only", () => {
    expect(shortHash("0x1234")).toBe("0x1234");
    expect(shortHash("0x" + "a".repeat(64))).toBe("0xaaaaaaaa…aaaaaa");
  });
  it("formats a countdown, never negative", () => {
    expect(formatCountdown(300_000)).toBe("5:00");
    expect(formatCountdown(59_000)).toBe("0:59");
    expect(formatCountdown(59_001)).toBe("1:00");
    expect(formatCountdown(-5)).toBe("0:00");
  });
  it("builds initials", () => {
    expect(initials("Demo Recipient")).toBe("DR");
    expect(initials("  solo ")).toBe("S");
  });
});

describe("sanitizeAccountInput", () => {
  it("keeps digits only", () => {
    expect(sanitizeAccountInput("123-456-7890")).toBe("1234567890");
    expect(sanitizeAccountInput("12a 34")).toBe("1234");
  });
  it("stops at 12 digits", () => {
    expect(sanitizeAccountInput("12 3456 7890 123")).toBe("123456789012");
    expect(sanitizeAccountInput("1".repeat(20))).toHaveLength(12);
  });
  it("handles empty input", () => {
    expect(sanitizeAccountInput("")).toBe("");
  });
});
