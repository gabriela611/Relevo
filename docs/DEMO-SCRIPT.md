# RELEVO demo script

## Before going on stage
- [ ] `backend/.env` has `OP_MODE=live` and the backend logs `MODE: LIVE · Interledger Test Wallet`.
- [ ] `npm run smoke:live --workspace=backend` passed today (`hash: MATCH`, `RESULT: PASS`).
- [ ] The buyer wallet has test-wallet balance.
- [ ] **The buyer is already logged in to https://wallet.interledger-test.dev in the browser that will open the consent link** (see lessons learned).
- [ ] For phones: the cloudflared tunnel is up and `PUBLIC_FRONTEND_URL` matches its current URL (README → "Teléfonos por HTTPS").
- [ ] Fallback ready: `OP_MODE=simulator` (the badge will say SIMULATOR, so the demo stays honest).

## Lessons learned from the live test

### Log the buyer in to the test wallet BEFORE opening the consent link
In our runs, the two attempts where the link was opened before logging in returned "Access to the given resource is forbidden". The run where the buyer logged in to the test wallet first, then opened a fresh link once, succeeded.

So: open https://wallet.interledger-test.dev and log in as the buyer in the same browser, then open the consent (`redirectUrl`) link.

### Open the consent link only once
Each consent link belongs to one interactive grant. In our runs, re-opening a link that had already been opened gave **"Access to the given resource is forbidden"**.

**Fix: run a new quote, don't reopen the link.** Go back to the PWA and request a new quote (`POST /api/payments/quote` → `authorize`), which creates a fresh grant and a new link. The sale stays payable: failed or abandoned attempts return it to `WAITING_PAYMENT`.

This is also why the backend never retries the consent grant request: every request would start a new interaction for the buyer.
