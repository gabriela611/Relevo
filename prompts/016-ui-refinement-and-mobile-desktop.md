# 016 — UI Refinement: Mobile Bleed, Floating Dock, Currency Formatting & First-Time Onboarding

**Intent:** Complete frontend UI refinement addressing desktop side borders, mobile carousel clipping, currency formatting with thousands separators and symbols, floating rounded navigation, camera scanner viewport, and first-time onboarding gating.

**Context:**
- Relevo is an offline-first PWA for point-of-sale payments with QR codes and ECDSA verification.
- Previous session experienced UI regressions due to invalid CSS utility classes (e.g., `h-38`) and broken inline CSS variable bindings (`var(--bg)`, `var(--primary)`).
- Desktop layout previously showed restrictive side borders, while mobile carousel cards were clipped by padding on the right edge.

**Scope:**
1. **Formatting & Math Integrity:**
   - Display amounts with Colombian peso symbol (`$`), thousands grouping dots (`.`), and decimal comma (`,`) without altering underlying raw numeric values in QR payloads.
   - Implement `formatReceivedToday` to compute and format today's verified receipts respecting minor-unit asset scales.
   - Retain visual entrance animation (`amount-change` / `amount-rise`) for keypad amount editing.
2. **Navigation & Desktop Layout:**
   - Detach bottom navigation bar into a responsive floating glass dock (`floating-nav`) with rounded corners and accessible active page state.
   - Remove container side borders on desktop, letting header and background span edge-to-edge with centered content (`app-content`).
   - Simplify header: provide a clean, accessible connectivity disclosure dot indicating online/offline state and honest offline capabilities.
3. **Mobile Carousel Card Bleed:**
   - Bleed the hero cards carousel container to the right edge on mobile (`-mr-5 pr-5 sm:mr-0 sm:pr-0 sm:grid sm:grid-cols-2`) so the secondary card smoothly extends off-screen without an abrupt white padding strip.
   - Fix invalid height utilities (`h-38` -> `min-h-[164px]`).
4. **First-Time Onboarding Experience:**
   - Persist onboarding completion in `localStorage` (`hasSeenOnboarding` / `setOnboardingSeen`).
   - Display `OnboardingView` on first launch or when explicitly navigating to `#bienvenida`. Subsequent launches land immediately on the home screen (`inicio`).
   - Refactor `OnboardingView` to use clean Tailwind utilities matching Apple Design without broken inline CSS variables.
5. **Camera & Transaction Styling:**
   - Remove black box clipping in `ScannerModal` camera viewport.
   - Style `TransactionRow` with profile avatar squircle, status pill, and currency symbol.

**Acceptance Criteria:**
- ✅ All 19 tests in test suite pass (`npm test`).
- ✅ Build (`npm run build`) completes with 0 errors.
- ✅ Linter (`npm run lint`) passes with 0 warnings and 0 errors.
- ✅ Onboarding is shown only once on first visit or via explicit `#bienvenida`.
- ✅ Hero cards bleed to the right edge on mobile and display as a responsive 2-column grid on desktop.
- ✅ Currency amounts show thousands separators and `$` symbol correctly.
