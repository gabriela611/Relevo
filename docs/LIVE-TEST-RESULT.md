# Live test result: 2026-10-17

**Result: PASS.** Full RELEVO flow against the Interledger Test Wallet, run with `npm run smoke:live --workspace=backend` (no frontend involved).

| | |
|---|---|
| Mode | `OP_MODE=live`, Interledger Test Wallet |
| Buyer → merchant | EUR wallet → USD wallet (cross-currency, fixed-receive quote) |
| Sale | 1.00 USD; buyer debited 1.90 EUR |
| GNAP interaction hash | `MATCH` (run with `STRICT_HASH=false`) |
| Funds | Read from the merchant's incoming payment before signing; attempt `COMPLETED` |
| Receipt | v2, `mode: live`, keyId `W76kA4PX3dUt9FCikc0jbmD_O6N_udBeWczRDEgO0P0` |
| Offline verification | `VALID (LIVE_PAYMENT)` with only the pinned public key, via `@relevo/shared` |
| Tamper check | Amount ×100 → `INVALID_SIGNATURE` |

Notes:
- The 1.90 EUR debit for 1.00 USD comes from the test network's rates and fees, not real market FX.
- The consent URL was removed from the output: it was single-use and has expired.
- Next step from the README procedure: since the hash was `MATCH`, set `STRICT_HASH=true` and re-run the smoke test to confirm `RESULT: PASS`.

## Output

```
RELEVO · live smoke test
mode: LIVE · Interledger Test Wallet
receipt keyId: W76kA4PX3dUt9FCikc0jbmD_O6N_udBeWczRDEgO0P0
STRICT_HASH: false

[1] merchant: https://ilp.interledger-test.dev/merchant123 (USD, scale 2)
    buyer:    https://ilp.interledger-test.dev/63eb9297 (EUR, scale 2)
[2] sale: smoke-34cecd89-1693-4d12-8e0f-38c68656e633 · 1.00 USD
[3] incoming payment + quote created
    quote aaf65417-2348-4f50-bed7-6ffcc652f1d8: buyer pays 1.90 EUR -> merchant receives 1.00 USD (expires 2026-10-17T05:54:15.273Z)
[4] consent required (payment aaf65417-2348-4f50-bed7-6ffcc652f1d8).
    [consent URL removed: single-use, expired]
    waiting up to 5 min for the wallet to redirect back...
[5] callback: payment=success
    hash: MATCH
[6] attempt status: COMPLETED
    incoming payment: https://ilp.interledger-test.dev/f537937b-7016-481b-b655-9f0d1014822c/incoming-payments/826fc107-c628-40d7-bb04-b3292030ab19
    outgoing payment: https://ilp.interledger-test.dev/f537937b-7016-481b-b655-9f0d1014822c/outgoing-payments/c2cb82a5-1bde-488b-82ed-43df24896445
[7] receipt aaa21425-d733-40a7-addf-44fc7a0dd684: 1.00 USD · mode live · keyId W76kA4PX3dUt9FCikc0jbmD_O6N_udBeWczRDEgO0P0
    offline verification: VALID (LIVE_PAYMENT)
    tamper check (amount x100): INVALID_SIGNATURE

✅ RESULT: PASS
```
