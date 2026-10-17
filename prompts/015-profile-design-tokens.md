# 015 — Profile Design & i18n with DESIGN.md Tokens

**Intent:** Apply comprehensive DESIGN.md visual system (Wellby-inspired fintech) to profile screen and full frontend refactor. Implement bilingual i18n (ES/EN), enforce 15M payment limit, and update all components to use exact design tokens (colors, typography, spacing).

**Context:**
- Relevo is a PWA for offline payment collection/verification using ECDSA P-256 signatures.
- Monorepo: `shared/`, `backend/`, `frontend/`.
- Previous iterations: Removed emoji avatars, wallet configuration from UI, complex gradients. User emphasized ultra-simple Apple Design for elderly/non-technical users.
- Provided DESIGN.md: Exact tokens for colors, typography scale (SF Pro), spacing (multiples of 4), component specs, dark mode.

**Scope:**
1. Update App.css with exact DESIGN.md tokens (colors, typography, spacing, radii, shadows).
2. Extend copy.ts with full bilingual support (ES/EN) and limits object (max: 15M COP).
3. Refactor OnboardingView, ProfileView, CollectView to use i18n helper and design tokens.
4. Enforce payment limit validation in numpad (max 15,000,000).
5. Apply SF Pro typography scale and 44-56px touch targets for accessibility.
6. Support dark mode (prefers-color-scheme: dark).

**Acceptance Criteria:**
- ✅ All colors in App.css match DESIGN.md tokens exactly.
- ✅ Typography uses SF Pro and exact font-size/weight/line-height from DESIGN.md.
- ✅ Spacing uses multiples of 4 (4, 8, 12, 16, 20, 24, 32, 40).
- ✅ All buttons are 44-56px for accessibility.
- ✅ OnboardingView, ProfileView use t(language) helper from copy.ts.
- ✅ CollectView numpad validates max 15M limit.
- ✅ Dark mode works (colors respond to prefers-color-scheme: dark).
- ✅ No hardcoded color/spacing strings; all use CSS vars.

**Test Plan:**
- Manual: Desktop, tablet, mobile (iOS notch/safe-area).
- Dark mode: Toggle system preference, verify colors.
- i18n: Switch language, verify Spanish and English text.
- Limits: Try entering > 15M in numpad, should reject.
- Accessibility: All buttons >= 44px, fonts readable at 100%.

**Risks:**
- Color accessibility: Some DESIGN.md colors may have low contrast in light/dark. Verify WCAG AA before shipping.
- i18n scope creep: Keep only essential strings; avoid full translation management.
- Breaking changes: Component API may change; update all consumers together.
