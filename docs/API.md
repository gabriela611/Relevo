# RELEVO Backend API (contract for the frontend)

Base: `/api`. Vite proxies `/api` to `http://localhost:3000`, so the PWA always calls relative URLs (`fetch('/api/...')`); that also makes it work through a single HTTPS tunnel.
Errors are always `{ success: false, error: string }` with a proper HTTP status. `error` is Spanish, ready to show.
Quote amounts are **human decimals** (`"15.00"`). Receipt amounts are **Open Payments minor units** (`{ value: "1500", assetCode: "USD", assetScale: 2 }`); format them with `formatAmount()` from `@relevo/shared`.

## Mode badge (show it on every screen)

`GET /api/health` → `{ status: 'ok', mode: 'live' | 'simulator', modeLabel }`

| `mode` | Badge text | Meaning |
|---|---|---|
| `live` | **LIVE · Interledger Test Wallet** | Real Open Payments flow on the Interledger test network. |
| `simulator` | **SIMULATOR** | In-memory flow for offline demos. No money moves. |

The backend runs in exactly one mode, set by `OP_MODE` in `backend/.env`. It never switches modes on its own: in live mode, Open Payments errors come back as errors (HTTP 502 with the provider description).

## Payer flow

```
POST /api/payments/quote      { sale, payerWalletAddress }  -> { quote }                     // show the breakdown
POST /api/payments/authorize  { quoteId: quote.quoteId }
     -> { requoted: false, paymentId, redirectUrl }   => window.location.href = redirectUrl
     -> { requoted: true, quote }                     => show the NEW breakdown, then authorize again with quote.quoteId
   ...buyer approves or rejects in their wallet...
   wallet -> GET /api/payments/callback -> 302 to PUBLIC_FRONTEND_URL/?saleId=..&paymentId=..&payment=success|pending|failed[&reason=..&error=..]
GET  /api/receipts/:saleId    -> { receipt }                                                  // show encodeReceiptToQr(receipt) as a QR
```

- `payment=pending`: call `POST /api/payments/verify { saleId }` every ~3 s until `status === 'PAYMENT_VERIFIED'`.
- `payment=failed`: show `error`, and use `reason` for logic:

| `reason` | What happened | UI |
|---|---|---|
| `GRANT_REJECTED` | Buyer pressed reject in their wallet | "Pago rechazado". The sale stays payable: offer to retry |
| `MISSING_INTERACT_REF` | Wallet came back without confirming | Same as rejected |
| `HASH_MISMATCH` | Callback failed the security check (only when `STRICT_HASH=true`) | Retry; tell the team |
| `PAYMENT_FAILED` | Grant OK but the outgoing payment failed (e.g. no balance) | Show `error` |
| `INVALID_STATE` / `UNKNOWN_PAYMENT` / `INTERNAL_ERROR` | Stale or duplicate callback | Reload the sale status |

In simulator mode, `redirectUrl` points straight back to the callback, so the same frontend code works without a wallet.

## Quote breakdown (`CurrencyQuote`)

```ts
{
  quoteId,
  debitAmount:   { value: '1.90', assetCode: 'EUR', assetScale: 2 },  // what the buyer pays
  receiveAmount: { value: '1.00', assetCode: 'USD', assetScale: 2 },  // what the merchant receives (exactly the sale amount)
  effectiveRate: '0.526315',   // receive per 1 unit of debit, decimal string (BigInt, truncated to 6 decimals), fees included
  fees: null,                  // cross-currency: null. Same currency: { value, assetCode, assetScale } = debit - receive
  feesIncluded: true,          // true when fees are inside effectiveRate (cross-currency)
  expiresAt                    // unix ms
}
```

Open Payments doesn't itemize fees. For cross-currency quotes they can't be separated from the exchange rate, so the API returns `fees: null` instead of a misleading `0.00`.

UI copy:
- **Cross-currency** (`feesIncluded: true`): **"Pagas 1.90 EUR · El comercio recibe 1.00 USD · Tasa incluye comisiones"**
- **Same currency** (`feesIncluded: false`): "Pagas 15.08 USD · El comercio recibe 15.00 USD · Comisión 0.08 USD"

Don't do arithmetic on these strings in the UI; show them as they come.

## Endpoints

| Method | Path | Body / Params | Response |
|---|---|---|---|
| GET | `/api/health` | – | `{ status, mode, modeLabel }` |
| GET | `/api/receipt-key` | – | `{ keyId, alg: 'ES256', publicKeyJwk }`: **pin this on the merchant device while online** |
| GET | `/api/config` | – | `{ receiptKey: {keyId, alg, publicKeyJwk}, defaultMerchant: {id,name,walletAddress}, mode, modeLabel }` |
| POST | `/api/sales` | `PaymentSaleRequest` (required: `saleId, merchantWalletAddress, amount, currency`; others defaulted) | `{ sale }` (idempotent) |
| GET | `/api/sales` | – | `{ sales }` (last 50) |
| GET | `/api/sales/:saleId` | – | `{ sale (with status), receipt \| null }` |
| POST | `/api/wallet/resolve` | `{ walletAddress }` (`$ilp...` accepted) | `{ wallet: { id, assetCode, assetScale, authServer, resourceServer } }` |
| POST | `/api/payments/quote` | `{ sale, payerWalletAddress }` | `{ quote: CurrencyQuote }`. 409 if already paid, 410 if the sale expired |
| POST | `/api/payments/authorize` | `{ quoteId }` | `{ requoted: false, paymentId, redirectUrl }` or `{ requoted: true, quote }` (quote expiring in < 60 s) |
| GET | `/api/payments/callback` | set by the backend (GNAP finish) | 302 to the frontend (see reasons above) |
| GET | `/api/payments/:paymentId` | – | `{ paymentId, saleId, attemptStatus, saleStatus, error?, hashCheck?: MATCH\|MISMATCH\|ABSENT, quote }` (see "Two status vocabularies") |
| POST | `/api/payments/verify` | `{ saleId }` | `{ status: 'PAYMENT_VERIFIED', receipt }` or `{ status: 'PROCESSING', receivedAmount, expectedAmount }` |
| GET | `/api/receipts/:saleId` | – | `{ receipt: VerifiedReceipt }` or 404 |
| POST | `/api/sync` | `OfflineSyncRecord[]` | `{ syncedCount, totalReceived, rejected: [{saleId, reason: INVALID_SIGNATURE\|MODE_MISMATCH}] }` |

## Two status vocabularies

A **sale** can have several payment **attempts** (one per quote). They use different fields so they can't be confused:

- **`saleStatus`** in `GET /api/payments/:id`, and **`sale.status`** in `/api/sales/*`: one of the 6 README states. **Drive the UI from this.**
- **`attemptStatus`** in `GET /api/payments/:id`: the state of that single attempt, mostly useful for debugging.

| `attemptStatus` | `saleStatus` at that moment | Meaning |
|---|---|---|
| `QUOTED` | `WAITING_PAYMENT` | Quote shown; the buyer hasn't authorized yet |
| `AUTHORIZATION_PENDING` | `AUTHORIZATION_PENDING` | Buyer sent to their wallet to consent |
| `PROCESSING` | `PROCESSING` | Consent given; outgoing payment sent, waiting for funds |
| `COMPLETED` | `PAYMENT_VERIFIED` | Funds verified on the merchant's incoming payment; receipt signed |
| `FAILED` | `WAITING_PAYMENT` | Attempt rejected or failed (see `error`/`reason`). **The sale stays payable: quote again** |
| `FAILED` | `FAILED_OR_EXPIRED` | The **sale itself** expired; it can't be paid any more |
| (any) | `OFFLINE_VERIFIED` | The merchant scanned the receipt and synced it (`/api/sync`) |

`FAILED_OR_EXPIRED` means the **sale** expired, never that a single attempt failed.

Sale lifecycle: `WAITING_PAYMENT → AUTHORIZATION_PENDING → PROCESSING → PAYMENT_VERIFIED → (merchant scans) OFFLINE_VERIFIED`; any of the first three → `FAILED_OR_EXPIRED` once `sale.expiresAt` passes.

## Receipt v2 (what the buyer shows as a QR)

The backend signs a receipt only after reading the merchant's incoming payment and confirming both: (1) it is fully paid in the asset and scale it requested, and (2) what arrived is at least the **sale** amount in the sale's currency (exact, scale-normalized). A partial payment, a payment in another currency, or an incoming payment for less than the sale never produces a receipt; the attempt stays `PROCESSING`. Every field except `payloadDigest` and `backendSignature` is signed. It contains **no payer data**.

```ts
{
  version: '2',
  receiptId, saleId,
  merchantWallet,                                   // wallet that received the funds
  amountReceived: { value, assetCode, assetScale }, // minor units, read from the incoming payment
  incomingPaymentId, outgoingPaymentId,
  issuedAt,                                         // unix ms
  keyId,                                            // RFC 7638 thumbprint of the signing key
  mode: 'live' | 'simulator',
  payloadDigest,                                    // sha-256 hex of the canonical signed fields
  backendSignature                                  // ECDSA P-256/SHA-256, IEEE P1363 (64 bytes), base64url
}
```

QR string: `relevo:receipt:v2:<base64url(JSON)>`, made by `encodeReceiptToQr` and read by `parseReceiptFromQr`.

## Merchant offline verification (MUST)

All of this is implemented in `@relevo/shared` as `verifyReceiptOffline(receipt, ctx)`. The frontend provides the device state:

```ts
import { importPinnedReceiptKey, parseReceiptFromQr, verifyReceiptOffline } from '@relevo/shared';

// Online, at onboarding and whenever there is connectivity:
const keyInfo = await (await fetch('/api/receipt-key')).json();
await idb.put('receiptKey', keyInfo);                          // pin { keyId, publicKeyJwk }

// Offline, when scanning:
const pinnedKey = await importPinnedReceiptKey(await idb.get('receiptKey')); // throws if keyId != thumbprint(jwk)
const result = await verifyReceiptOffline(parseReceiptFromQr(scanned), {
  pinnedKey,
  deviceWallet: myMerchantWallet,                              // this device's own wallet
  getDeviceSale: (saleId) => idb.get('sales', saleId),         // ONLY sales created on this device
  isRedeemed: async (r) => !!(await idb.get('redeemed', r.receiptId)) || (await idb.get('sales', r.saleId))?.status === 'OFFLINE_VERIFIED',
});
if (result.valid) await idb.put('redeemed', { receiptId: result.receipt.receiptId, saleId: result.receipt.saleId });
```

Checks, in order; the first failure is returned as `{ valid: false, error, message }`:

| # | Check | `error` |
|---|---|---|
| 1 | Is a well-formed v2 receipt | `INVALID_FORMAT` |
| 2 | `keyId` equals the pinned key's `keyId` | `KEY_MISMATCH`: "Este comercio tiene una llave desactualizada. Conéctate a internet una vez para actualizarla." |
| 3 | Digest recomputed from the content matches, and the ECDSA signature is valid with the pinned public key | `INVALID_SIGNATURE` |
| 4 | `saleId` was created on this device | `UNKNOWN_SALE` |
| 5 | Not redeemed before on this device (IndexedDB) | `ALREADY_REDEEMED` |
| 6 | `merchantWallet` equals this device's wallet | `MERCHANT_MISMATCH` |
| 7 | Same asset code as the sale | `ASSET_MISMATCH` |
| 8 | `amountReceived >= sale.amount`: exact BigInt comparison, independent of scale | `AMOUNT_INSUFFICIENT` |

A valid result has `kind`:
- `LIVE_PAYMENT`: show as paid.
- `SIMULATED_PAYMENT`: the receipt was signed with `mode: "simulator"`. **Show it as a simulation ("SIMULACIÓN · no es dinero real"), never as a real payment.**

Store the redemption only after a valid result. `message` is a ready-to-show Spanish string in every case.
