import { describe, expect, it } from "vitest";
import { markDrifted } from "@/web/api/drift";
import { snapshotWith } from "@/web/api/fixtures";
import { memoryStore } from "@/web/storage";
import { canPayFromWallet, reconcileFunding, debitForTransfer, getBalanceMinor, getPaySource, resetWallet, setPaySource } from "@/web/wallet";

describe("wallet", () => {
  it("starts at $50.00", () => {
    expect(getBalanceMinor(memoryStore())).toBe(5000n);
  });
  it("allows paying exactly the balance, not more", () => {
    const s = memoryStore();
    expect(canPayFromWallet("5000", s)).toBe(true);
    expect(canPayFromWallet("5001", s)).toBe(false);
  });
  it("debits a wallet transfer once, even if called again after a refresh", () => {
    const s = memoryStore();
    setPaySource("trf_1", "WALLET", s);
    debitForTransfer("trf_1", "1000", s);
    debitForTransfer("trf_1", "1000", s);
    expect(getBalanceMinor(s)).toBe(4000n);
  });
  it("never debits a card transfer or one with no stored source", () => {
    const s = memoryStore();
    setPaySource("trf_card", "CARD", s);
    debitForTransfer("trf_card", "1000", s);
    debitForTransfer("trf_unknown", "1000", s);
    expect(getBalanceMinor(s)).toBe(5000n);
  });
  it("remembers the source per transfer and returns null when missing", () => {
    const s = memoryStore();
    setPaySource("trf_1", "WALLET", s);
    expect(getPaySource("trf_1", s)).toBe("WALLET");
    expect(getPaySource("trf_2", s)).toBeNull();
  });
  it("treats a corrupt stored balance as the start balance", () => {
    const s = memoryStore();
    s.setItem("centme:walletMinor", "abc");
    expect(getBalanceMinor(s)).toBe(5000n);
  });
  it("reset restores $50.00", () => {
    const s = memoryStore();
    setPaySource("trf_1", "WALLET", s);
    debitForTransfer("trf_1", "1000", s);
    resetWallet(s);
    expect(getBalanceMinor(s)).toBe(5000n);
  });
});

describe("wallet after presenter reset", () => {
  it("debits a new transfer when mock reset reuses a transfer id", () => {
    const s = memoryStore();
    setPaySource("trf_1", "WALLET", s);
    debitForTransfer("trf_1", "1000", s);
    resetWallet(s);
    setPaySource("trf_1", "WALLET", s);
    debitForTransfer("trf_1", "1000", s);
    expect(getBalanceMinor(s)).toBe(4000n);
  });
});

it("reset clears tracked sources and debit records, preserving unrelated storage", () => {
  const s = memoryStore();
  s.setItem("centme:scenario", "HAPPY_PATH");
  setPaySource("wallet", "WALLET", s);
  setPaySource("card", "CARD", s);
  debitForTransfer("wallet", "1000", s);
  resetWallet(s);
  expect(getPaySource("wallet", s)).toBeNull();
  expect(getPaySource("card", s)).toBeNull();
  expect(s.getItem("centme:walletDebited:wallet")).toBeNull();
  expect(s.getItem("centme:scenario")).toBe("HAPPY_PATH");
});

it("recovers an accepted wallet debit from a fetched snapshot once", () => {
  const s = memoryStore();
  const accepted = snapshotWith({ status: "COMPLETED_SIMULATED", funding: { status: "ACCEPTED" } });
  setPaySource(accepted.id, "WALLET", s);
  reconcileFunding(accepted, s);
  reconcileFunding(accepted, s);
  expect(getBalanceMinor(s)).toBe(4000n);
});

it("never reconciles a debit from declined or pending funding", () => {
  const s = memoryStore();
  const pending = snapshotWith({ status: "FUNDING_PENDING", funding: { status: "PENDING" } });
  setPaySource(pending.id, "WALLET", s);
  reconcileFunding(pending, s);
  reconcileFunding(snapshotWith({ status: "FUNDING_FAILED", funding: { status: "DECLINED" } }), s);
  expect(getBalanceMinor(s)).toBe(5000n);
});

it("never debits a snapshot rejected by contract validation", () => {
  const s = memoryStore();
  const invalid = markDrifted(snapshotWith({ status: "COMPLETED_SIMULATED", funding: { status: "ACCEPTED" } }));
  setPaySource(invalid.id, "WALLET", s);
  reconcileFunding(invalid, s);
  expect(getBalanceMinor(s)).toBe(5000n);
});
