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
Open https://wallet.interledger-test.dev and log in as the buyer first, in the same browser, then open the consent (`redirectUrl`) link. If you log in after following the link, the approval doesn't go through cleanly, and you have to start over with a new quote.

### Open the consent link only once
Each consent link belongs to one interactive grant and works once. Re-opening it, reloading it, or opening it in a second tab gives **"Access to the given resource is forbidden"**.

If that happens, don't retry the same link. Go back to the PWA and request a new quote (`POST /api/payments/quote` → `authorize`), which creates a fresh grant and a new link. The sale stays payable: failed or abandoned attempts return it to `WAITING_PAYMENT`.

This is also why the backend never retries the consent grant request: every request would start a new interaction for the buyer.
