import { isDrifted } from "./api/drift";
import type { TransferSnapshot } from "./api/types";
import { browserStorage, type KeyValueStore } from "./storage";

/** Fake CentMe wallet for the demo. Lives in sessionStorage; the server never knows about it. */
export type PaySource = "CARD" | "WALLET";

const BALANCE_KEY = "centme:walletMinor";
const TRANSFERS_KEY = "centme:walletTransfers";
const START_MINOR = 5000n; // $50.00
const sourceKey = (id: string) => `centme:paySource:${id}`;
const debitedKey = (id: string) => `centme:walletDebited:${id}`;
const session = () => browserStorage("session");


/** Track keys because KeyValueStore deliberately has no storage-wide enumeration. */
function trackedTransfers(store: KeyValueStore): string[] {
  try {
    const ids: unknown = JSON.parse(store.getItem(TRANSFERS_KEY) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
export function getBalanceMinor(store: KeyValueStore = session()): bigint {
  const raw = store.getItem(BALANCE_KEY);
  return raw !== null && /^\d+$/.test(raw) ? BigInt(raw) : START_MINOR;
}

export function canPayFromWallet(amountMinor: string, store: KeyValueStore = session()): boolean {
  return BigInt(amountMinor) <= getBalanceMinor(store);
}

export function setPaySource(transferId: string, source: PaySource, store: KeyValueStore = session()): void {
  const ids = trackedTransfers(store);
  if (!ids.includes(transferId)) store.setItem(TRANSFERS_KEY, JSON.stringify([...ids, transferId]));
  store.setItem(sourceKey(transferId), source);
}

export function getPaySource(transferId: string, store: KeyValueStore = session()): PaySource | null {
  const v = store.getItem(sourceKey(transferId));
  return v === "CARD" || v === "WALLET" ? v : null;
}

/** Called after funding is accepted. A refresh replays funding, so the debit is marked per transfer. */
export function debitForTransfer(transferId: string, amountMinor: string, store: KeyValueStore = session()): void {
  if (getPaySource(transferId, store) !== "WALLET" || store.getItem(debitedKey(transferId))) return;
  const next = getBalanceMinor(store) - BigInt(amountMinor);
  store.setItem(BALANCE_KEY, String(next < 0n ? 0n : next));
  store.setItem(debitedKey(transferId), "1");
}

/** Recover accepted funding after a lost response; once-only markers also cover polling and refresh. */
export function reconcileFunding(snapshot: TransferSnapshot, store: KeyValueStore = session()): void {
  if (!isDrifted(snapshot) && snapshot.funding.status === "ACCEPTED") {
    debitForTransfer(snapshot.id, snapshot.amounts.sourceDebitMinor, store);
  }
}
export function resetWallet(store: KeyValueStore = session()): void {
  for (const id of trackedTransfers(store)) {
    store.removeItem(sourceKey(id));
    store.removeItem(debitedKey(id));
  }
  store.removeItem(TRANSFERS_KEY);
  store.removeItem(BALANCE_KEY);
}
