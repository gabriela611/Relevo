# RELEVO Backend API (contract for the frontend)

Base: `/api` (Vite proxies `/api` → `http://localhost:3000`). Errors are always `{ success: false, error: string }` with a proper HTTP status.
Amounts in requests/responses are **human decimals** (`"15.00"`); the backend converts to Open Payments minor units internally.

## Payer flow (4 calls)

```
POST /api/payments/quote      { sale, payerWalletAddress }  -> { quote }            // show breakdown
POST /api/payments/authorize  { quoteId: quote.quoteId }    -> { paymentId, redirectUrl }
window.location.href = redirectUrl                                                     // payer approves in their wallet
   ...wallet -> GET /api/payments/callback -> 302 to FRONTEND_URL/?saleId=..&paymentId=..&payment=success|pending|failed[&error=..]
GET  /api/receipts/:saleId    -> { receipt }                                           // encodeReceiptToQr(receipt) and show QR
```

If `payment=pending`: call `POST /api/payments/verify { saleId }` every few seconds until `status === 'PAYMENT_VERIFIED'` (it returns `{ receipt }`).
In **simulator mode** `redirectUrl` points straight to the callback, so the same code works with no wallet.

## Endpoints

| Method | Path | Body / Params | Response |
|---|---|---|---|
| GET | `/api/health` | – | `{ status, mode: 'live'\|'simulator' }` |
| GET | `/api/config` | – | `{ backendPublicKeyJwk, defaultMerchant: {id,name,walletAddress}, mode }` — merchant device caches `backendPublicKeyJwk` for offline verification |
| POST | `/api/sales` | `PaymentSaleRequest` (required: `saleId, merchantWalletAddress, amount, currency`; others defaulted) | `{ sale }` (idempotent) |
| GET | `/api/sales` | – | `{ sales }` (last 50) |
| GET | `/api/sales/:saleId` | – | `{ sale (with status), receipt \| null }` |
| POST | `/api/wallet/resolve` | `{ walletAddress }` (`$ilp...` accepted) | `{ wallet: { id, assetCode, assetScale, authServer, resourceServer } }` |
| POST | `/api/payments/quote` | `{ sale, payerWalletAddress }` | `{ quote: CurrencyQuote }` — 409 if paid, 410 if sale expired |
| POST | `/api/payments/authorize` | `{ quoteId }` | `{ paymentId, redirectUrl }` — 410 if quote expired |
| GET | `/api/payments/callback` | set by backend (GNAP finish) | 302 → frontend |
| GET | `/api/payments/:paymentId` | – | `{ paymentId, saleId, status: QUOTED\|AUTHORIZATION_PENDING\|PROCESSING\|COMPLETED\|FAILED, error?, quote }` |
| POST | `/api/payments/verify` | `{ saleId }` | `{ status: 'PAYMENT_VERIFIED', receipt }` or `{ status: 'PROCESSING', receivedAmount, expectedAmount }` |
| GET | `/api/receipts/:saleId` | – | `{ receipt: VerifiedReceipt }` / 404 |
| POST | `/api/sync` | `OfflineSyncRecord[]` | `{ syncedCount, totalReceived, rejected: [{saleId, reason}] }` — receipts not signed by the backend are rejected |

## Sale status (`sale.status`)
`WAITING_PAYMENT → AUTHORIZATION_PENDING → PROCESSING → PAYMENT_VERIFIED → (merchant scans) OFFLINE_VERIFIED`.
A rejected or failed attempt returns the sale to `WAITING_PAYMENT` (you can quote again). An expired sale becomes `FAILED_OR_EXPIRED`.

## Merchant offline check (frontend, no backend call)
```ts
import { parseReceiptFromQr, verifyReceiptOffline, importPublicKeyFromJwk } from '@relevo/shared';
const key = await importPublicKeyFromJwk(cachedConfig.backendPublicKeyJwk);
const result = await verifyReceiptOffline(parseReceiptFromQr(scanned)!, activeSale, key, redeemedIds);
```
