# CentMe bank logos, pay source, invoice — design

Date: 2026-10-16 (04:00, about 8 hours before demo). Owner: Pong (person 1).
Code lives in `D:\U-hackathon_backend` (frontend in `src/web/` + `src/components/`, tests in `tests/web/`). Branch off the current `feat/ui-polish-recipient`.

**Frontend only.** No backend route, schema, or contract change. Time budget about 2.5 hours.

## Why

Feedback after the UI polish pass:

1. The recipient's bank should show its logo.
2. The account number input lets you type past 12 digits; it should stop at 12.
3. The sender should choose how to pay: card or money already in a CentMe wallet.
4. The transfer needs an invoice, not just an on-screen receipt.

Considered and cut for time: QR deposit (a US sender does not top up by QR; funding is simulated anyway, so it adds no evidence) and payment request + QR (best demo moment, but needs a backend route; mention it in the pitch as the next feature).

## 1. Bank logos

- `src/web/banks.ts`: one table for the 7 banks: `code`, `label` (same strings the server's `bankLabel()` returns: `Kasikorn Bank`, `SCB`, `Bangkok Bank`, `Krungthai`, `Krungsri`, `ttb`, `GSB`), `short` (2-4 chars: `K`, `SCB`, `BBL`, `KTB`, `BAY`, `ttb`, `GSB`), brand `bg` and `fg` colors. Plus `bankByLabel(label)`, which returns `undefined` for unknown labels (e.g. the seeded "Demo Thai Bank").
- `src/components/common/BankLogo.tsx`: a rounded square badge (40px on the card, 24px in the picker) with the bank's brand color and short name. Unknown bank: neutral `bg-secondary` badge with a Lucide `landmark` icon. `aria-hidden`; the bank name stays as visible text next to it.
- Monogram badges instead of real logo files: no image licensing question and no assets to hunt for at 4am. If the team finds official SVGs later, `BankLogo` can render `public/banks/<code>.svg` without other changes.
- `RecipientCard`: the badge replaces the initials avatar.
- `RecipientForm`: the native bank `<select>` cannot show images, so it becomes a listbox built on shadcn `Select` (Radix; add `src/components/ui/select.tsx`). Each option: badge + label. It keeps the same id, label, `aria-invalid`, and error wiring, and focus-on-error still works.

## 2. Account number cap

In `RecipientForm`, `onChange` keeps digits only and cuts to 12: `e.target.value.replace(/\D/g, "").slice(0, 12)`. `maxLength={12}`. Pasting `123-456-7890` becomes `1234567890`. Help text stays "10-12 digits". Validation (10-12) is unchanged.

## 3. Pay source: card or wallet

- `src/web/wallet.ts`: wallet balance in `sessionStorage` (`centme:walletMinor`, USD minor units as a string, default `"5000"` = $50.00), read and written through the existing `storage.ts` wrapper. Functions: `getBalanceMinor()`, `debit(minor)`, `resetWallet()`. Also the per-transfer source: `setPaySource(transferId, "CARD" | "WALLET")`, `getPaySource(transferId)` (key `centme:paySource:<id>`).
- `BankSheet` gets two radio cards (one `role="radiogroup"`, arrow-key navigation):
  - **Card**: "Visa ••4821" with a Lucide `credit-card` icon. Selected by default.
  - **CentMe wallet**: "Balance $50.00" with a Lucide `wallet` icon. When the balance is below the quote's `sourceDebitMinor`, the option is disabled and shows "Not enough balance" (text, not just grey).
  - Title becomes "Choose how to pay"; the button stays **Confirm payment**.
- On confirm, the call is the same as today (`simulateFunding`). After it succeeds, store the pay source for that transfer, and if it was the wallet, debit the balance. If funding fails, nothing is debited.
- Receipt adds a row "Paid from": "Visa ••4821" or "CentMe wallet". If no source is stored (another browser, or a refresh after clearing storage), the row is hidden.
- Presenter panel: "Reset mock data" also calls `resetWallet()`.
- Funding is still simulated; the footer line already says so. No new labels.

## 4. Printable invoice

- Receipt card header adds "Invoice no. INV-<receipt id>" (mono) and a **Print / Save PDF** button (outline, Lucide `printer`, next to Copy link). It calls `window.print()`. No PDF library.
- The receipt section gets an issued-to block: sender "CentMe demo sender" and the recipient name, bank, and masked account (already in the snapshot).
- Print styles in `globals.css` (`@media print`): hide the header, footer, timeline, Details, action buttons, presenter panel, and toasts; the receipt goes full width with no shadow and black text on white; the Snowtrace URL is printed as text after the link. The CentMe wordmark is printed at the top of the receipt (`print:block`, hidden on screen).

## i18n

New EN and TH keys for: sheet title, card label, wallet label and balance, "Not enough balance", "Paid from", invoice number, issued to, print button. Card text and the `Visa ••4821` / `INV-` strings stay the same in both languages. The parity test must still pass.

## Testing

- `tests/web`: `banks.ts` labels match `bankLabel()` from `@/domain/recipients` for all 7 codes; `bankByLabel("Demo Thai Bank")` is undefined; account input sanitizer (letters, dashes, 13+ digits); wallet debit, insufficient check, reset, per-transfer source; i18n parity.
- Browser walkthrough (mock mode, 1280px and 375px, EN and TH):
  - Change recipient, pick SCB in the picker using only the keyboard, see the badge on the card; type 15 digits and see only 12.
  - Pay $10 with the wallet: balance becomes $40.00; receipt says "Paid from CentMe wallet".
  - Set the amount to $45 after that: the wallet is disabled with "Not enough balance"; pay by card.
  - Print preview: one clean page with the logo, invoice no., parties, amounts, fee, rate, and tx hash + Snowtrace URL; no header or timeline.

## Out of scope

- Real card entry, wallet top-up flow, a server-side wallet, QR deposit, payment request.
- Changing the funding contract (the server does not know the pay source).
