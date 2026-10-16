# RELEVO — context for Claude Code

Hackathon MVP (Open Payments / Interledger). PWA where a merchant receives cross-currency payments and **verifies them offline** by scanning a receipt QR signed by our backend (ECDSA P-256). Read `README.md` (product) and `ARCHITECTURE.md` (protocol) before larger changes; `docs/API.md` is the frontend↔backend contract.

## Monorepo (npm workspaces, Node 24, TypeScript ESM)
- `shared/` — types, Web Crypto (sign/verify), QR encode/decode, `verifyReceiptOffline`. **Must be built** (`npm run build --workspace=shared`) before backend/frontend can import it — after editing shared, rebuild.
- `backend/` — Fastify + `node:sqlite` + `@interledger/open-payments` 7.x.
  - `src/app.ts` routes (`buildServer`), `src/server.ts` boot.
  - `src/services/openPayments.ts` — payment flow orchestrator (quote → authorize → callback → verify → signed receipt).
  - `src/services/gateways/` — `live.ts` (real Open Payments SDK) and `simulator.ts` (same flow in memory). Mode is auto: live when `OPEN_PAYMENTS_KEY_ID` + private key are set, else simulator.
  - `src/services/db.ts` — tables `sales`, `payments` (one row per payment attempt; id = quoteId given to the frontend), `receipts`, `merchants`.
- `frontend/` — React + Vite + Tailwind v4 PWA (proxy `/api` → :3000).

## Commands
- `npm install` · `npm run build --workspace=shared`
- `npm run dev:backend` (port 3000) · `npm run dev:frontend` (port 5173)
- `npm test` (builds shared, runs backend tests via `tsx --test`) · `npm run typecheck --workspace=backend`

## Rules that must not break
- **Golden rule:** never sign a receipt or mark a sale paid without reading the merchant's incoming payment and confirming `receivedAmount >= incomingAmount`. Authorization or a completed outgoing payment is not proof.
- Receipts are immutable once issued (`INSERT ... ON CONFLICT DO NOTHING`); `/api/sync` only accepts receipts that carry our own valid signature.
- Open Payments amounts are integer strings in minor units (`"1500"`, scale 2). Use `services/amounts.ts` (BigInt), never floats, for anything that decides payment validity.
- Never commit `.env`, `*.key`, `*.pem`, `.relevo-backend-keys.json`, `*.sqlite`.
- Code/comments in English is fine; user-facing error messages are in Spanish.

## Git workflow (branch per feature)
- Branch from `main`: `feature/<area>-<short-name>` (e.g. `feature/backend-open-payments`, `feature/frontend-merchant-scan`), `fix/<name>` for bugfixes.
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Open a PR into `main`; run `npm test` before pushing. Keep PRs small so teammates can merge often.

## Open Payments cheat sheet
See `.claude/skills/open-payments/SKILL.md` for the full flow, SDK calls and test-wallet setup.
