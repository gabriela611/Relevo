---
name: open-payments
description: Reference for implementing or debugging Open Payments / Interledger flows in RELEVO (grants/GNAP, incoming payments, quotes, outgoing payments, test wallet setup, SDK @interledger/open-payments 7.x). Use when touching backend/src/services/openPayments.ts or gateways/, when a payment fails with an Open Payments error, or when setting up live credentials.
---

# Open Payments in RELEVO

## The flow (what `gateways/live.ts` does)
1. **Resolve wallets** — `client.walletAddress.get({ url })` → `{ id, assetCode, assetScale, authServer, resourceServer }`.
2. **Incoming payment (merchant)** — non-interactive grant on merchant `authServer`:
   `grant.request({ url: authServer }, { access_token: { access: [{ type: 'incoming-payment', actions: ['create','read'] }] } })`
   then `incomingPayment.create({ url: resourceServer, accessToken }, { walletAddress, incomingAmount, expiresAt })`.
3. **Quote (payer)** — non-interactive grant `type: 'quote'` on payer `authServer`, then
   `quote.create({ url: payerResourceServer, accessToken }, { walletAddress: payer.id, receiver: incomingPayment.id, method: 'ilp' })`.
   Because the incoming payment has `incomingAmount`, this is a fixed-receive quote: the merchant gets exactly the sale amount and `debitAmount` is what the payer pays in their own currency.
4. **Interactive grant (payer consent)** — `grant.request` with `type: 'outgoing-payment'`, `identifier: payer.id`, `limits: { debitAmount: quote.debitAmount }` and
   `interact: { start: ['redirect'], finish: { method: 'redirect', uri: <our callback>, nonce } }`. Result `isPendingGrant` → send the browser to `interact.redirect`; store `continue.uri`, `continue.access_token.value`, `interact.finish`.
5. **Callback** — wallet redirects to our finish URI with `interact_ref` and `hash` (or `result=grant_rejected`).
   `grant.continue({ url: continue.uri, accessToken: continueToken }, { interact_ref })` → `isFinalizedGrantWithAccessToken`.
6. **Outgoing payment** — `outgoingPayment.create({ url: payerResourceServer, accessToken }, { walletAddress: payer.id, quoteId })`.
7. **Verify (golden rule)** — read the incoming payment with an `incoming-payment` `read` grant; only when `receivedAmount.value >= incomingAmount.value` sign the receipt. Settlement takes ~1–3 s; the backend polls for `VERIFY_TIMEOUT_MS`.

Interaction hash: `base64(sha256(clientNonce \n finishNonce \n interact_ref \n authServerUrl))`.

## Amounts
Integer strings in minor units: `{ value: '1500', assetCode: 'USD', assetScale: 2 }` = 15.00 USD. Convert with `backend/src/services/amounts.ts`.

## Test wallet setup (live mode)
1. Sign up at https://wallet.interledger-test.dev (play money). Create an account + wallet address for **RELEVO client** (can be the merchant wallet).
2. Settings → **Developer Keys** → generate → copy **Key ID**, download `private.key` into `backend/` (gitignored).
3. `backend/.env`: `OPEN_PAYMENTS_CLIENT_WALLET`, `OPEN_PAYMENTS_KEY_ID`, `OPEN_PAYMENTS_PRIVATE_KEY_PATH=./private.key`, `MERCHANT_WALLET`.
4. Create a second user (the payer/tourist), ideally with a different currency, and fund it in the test wallet.
5. `npm run dev:backend` should log `Live Open Payments client`. `GET /api/health` → `mode: 'live'`.

## Debugging
- `OpenPaymentsClientError` → our error handler logs `status`, `description`, `validationErrors` and returns 502 with the description.
- 401/invalid signature on grant requests → wrong key ID / key file / client wallet does not own the key.
- Merchant wallet currency must equal `sale.currency` in live mode (backend returns 400 otherwise).
- Payer approves on the wallet's site, so `PUBLIC_BACKEND_URL` must be reachable from the payer's browser (use a tunnel for phones).
- Force the demo-safe path with `RELEVO_SIMULATOR=true`.

## Docs
- https://openpayments.dev/es/ · SDK: https://openpayments.dev/es/sdk/before-you-begin/
- Repo + examples: https://github.com/interledger/open-payments
