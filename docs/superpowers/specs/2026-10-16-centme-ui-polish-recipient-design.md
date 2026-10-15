# CentMe UI polish + fillable recipient — design

Date: 2026-10-16. Owner: Pong (person 1). Reviewer for backend part: person 2.
Code lives in `D:\U-hackathon_backend` (branch `part-2&3-merged`, frontend in `src/web/` + `src/components/`, tests in `tests/`).

## Why

Feedback after the first walkthrough:

1. The UI says "mock" / "simulated" / "test mode" too often. On stage the settlement really runs on Avalanche Fuji, so the copy should lead with that.
2. The recipient on page 1 is fixed to the seeded "Demo Recipient". For the demo we want to type in a recipient live.
3. The header looks weak: small text, feels out of scale with the main page.
4. The language toggle says "ภาษาไทย" as text; a flag reads faster.

Bank funding and THB payout are still simulated. We stay honest about that, in one quiet line instead of on every element.

## 1. Backend: `POST /api/recipients`

Pong writes it; person 2 reviews (they own sessions/recipients/quotes).

Request (session cookie required, same-origin checks as other routes):

```json
{ "name": "Somchai Jaidee", "bankCode": "KBANK", "accountNumber": "1234567890" }
```

Validation (reject unknown extra fields, like the quote route):

- `name`: trimmed, 1-60 chars. Thai or Latin letters, spaces, `.`, `-`, `'`.
- `bankCode`: one of `KBANK`, `SCB`, `BBL`, `KTB`, `BAY`, `TTB`, `GSB`. Server maps it to `bank_label` (`Kasikorn Bank`, `SCB`, `Bangkok Bank`, `Krungthai`, `Krungsri`, `ttb`, `GSB`).
- `accountNumber`: digits only after stripping spaces and `-`, length 10-12.
- Max 10 recipients per session (seeded one included). Over the cap: `409 RECIPIENT_LIMIT`.

Storage: insert into existing `recipients` table, no migration. `id = rcp_<uuid>`, `owner_id` = session owner, `account_display = "••" + last 4 digits`, `is_synthetic = true`. **The full account number is never stored or logged** (someone may type a real one on stage).

Response: `201 Created`, `data: { recipient: RecipientView }` (same public shape as `GET`).
Errors: `422 INVALID_INPUT` with `fieldErrors.{name|bankCode|accountNumber}`; `401` without session; `409 RECIPIENT_LIMIT`.

`GET /api/recipients` keeps its current order; the client picks by stored id (section 2).

Files: `src/app/api/recipients/route.ts` (add `POST`), `src/server/recipients.ts` (`createSessionRecipient`), `src/db` insert helper, `docs/api-contract.md` section 3 (U-Hackathon copy, plus the backend repo copy if present), route tests in `tests/api`.

## 2. Frontend: fillable recipient on page 1

- `ApiClient` gains `createRecipient({ name, bankCode, accountNumber }): Promise<Recipient>`, in `real.ts` and `mock.ts` (mock keeps an in-memory list, same validation and last-4 masking).
- `RecipientCard` gets a "Change" link button. Clicking it swaps the card for an inline form: name input, bank `<select>`, account number input (`inputMode="numeric"`), Save + Cancel.
- Client-side validation mirrors the server rules; server `fieldErrors` show under the matching field.
- Save: POST, then the new recipient becomes selected; form closes; focus returns to the "Change" button.
- Selected recipient id is kept in `sessionStorage` (`centme:recipientId`). On load: use the stored id if it is in the `GET` list, else the first recipient.
- Changing the recipient clears any open quote / checks alert (same as editing the amount).
- Review, tracking and receipt need no change: they already read the recipient from the server quote/transfer snapshot.

## 3. Copy cleanup ("one quiet line")

Remove:

- Header "Test mode" chip (`header.testMode`).
- `SIMULATED` evidence tags in `ReviewStep`, `BankSheet`, `ChecksAlert`, and on the funding/payout steps in `Timeline`.
- `sheet.simNote` line in the bank sheet.
- "in test mode" from `send.amountHelp` and `send.error.TOO_LARGE` (limits stay $1-$100).
- "Demo timing only" (`send.timing`): show `quote.arrivalEstimate` when present, else "About a minute".
- `receipt.summary` "Demo completed — THB payout simulated." becomes "Transfer complete."

Keep:

- `Testnet · Fuji` tag on the settlement step, and the Snowtrace link.
- The checks alert text ("Simulated checks rejected…") — it only appears when the presenter forces it.
- `MockBanner`, but only in mock mode (local dev); shorter text: "Mock mode: no Fuji transaction." Never visible in real mode on stage.

Add one footer line under `<main>` in `layout.tsx`, small muted text, centered:
"Bank steps are simulated. USDC settles on Avalanche Fuji testnet."

`metadata.description`: "Send USD to Thailand. USDC settles on Avalanche Fuji testnet."

Thai (`th.ts`) gets the matching changes. Remove keys that are no longer used.

## 4. Header

- Height 80px (`h-20`), same `max-w-[1040px]` container and padding as `<main>` so edges line up with the cards. Keeps bottom border and `bg-card`.
- Wordmark height 44px (`h-11`, was `h-9`).
- Right side, `gap-3`:
  - Status pill: green dot + "Fuji testnet" (same in TH; tech term), 14px medium, `bg-secondary`, rounded-full. In mock mode the dot is amber and the text is "Mock mode".
  - Language toggle: outline button, 40px tall, shows the **target** language: Thai flag + "TH" in English mode, US flag + "EN" in Thai mode. 14px medium. `aria-label` unchanged ("Switch language to Thai" / Thai equivalent).
- Flags are small inline SVG components (`src/components/shell/Flag.tsx`, 20x14, rounded 2px, 1px hairline border), **not emoji**: Windows Chrome renders flag emoji as the letters "TH"/"US".
- Mobile (< 640px): pill hides its text and keeps the dot with an `aria-label`; toggle keeps flag + code.

## Testing

- `tests/api`: POST happy path (201, last-4 display, `is_synthetic`), each invalid field (422 + fieldErrors), extra field rejected, no session (401), other session cannot see it in GET, cap (409), full account number absent from DB row.
- `tests/web`: mock `createRecipient` validation and masking; stored-id selection logic; i18n key parity EN/TH still passes after key removal.
- Browser walkthrough: header at 1280px and 375px in EN and TH; change recipient, send, confirm name on review, tracking and receipt; grep the rendered page for "mock"/"simulated" in real mode — only the footer line and checks alert may mention simulation.

## Out of scope

- Real bank account verification or name lookup.
- Editing or deleting recipients; a recipient picker list (the stored-id fallback covers refresh).
- Any change to quote, transfer, or settlement logic.
