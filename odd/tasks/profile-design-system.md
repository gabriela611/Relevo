# Perfil mejorado para usuarios no técnicos — REDISEÑADO

**Objetivo:** Pantalla de perfil elegante y simple siguiendo Apple Design limpio, sin emojis, sin degradados innecesarios, registration on-brand, responsive completo con nav bar macOS, animaciones sutiles.

**Rama:** `feature/frontend-design-system` · **Tests:** `npm test` · **Build:** `npm run dev:frontend`

## Specs

S1. **(Registro limpio)** Paso 2-pantalla con campos: nombre negocio, moneda, billetera Interledger. Diseño minimalista, sin emojis. Salva en `StoredMerchant` en localStorage.

S2. **(Perfil minimalista)** Avatar inicial (letra), nombre en grande, tarjeta billetera limpia (copiar de 1 click), edición inline, preferencias idioma/tema.

S3. **(Full responsive)** Edge-to-edge mobile, safe-area respetadas, iPad/desktop centrado 520px.

S4. **(Nav bar macOS)** Blur backdrop, bordes redondeados mobile (rounded-b-3xl), flotante desktop.

S5. **(Animaciones sutiles)** Total verificado: @verified-pulse 600ms (scale + opacity), sin reflow.

S6. **(Apple Design)** Minimalista, blanco + lima + púrpura, sin gradientes complicados, solo sombras suaves.

S7. **(Open Payments integration)** Hints claros en billetera, ejemplos formato ILP.

## Tasks

- **T1 (✅ inline, S1)**: OnboardingView paso 2 — registro limpio, sin emojis, campos nombre/moneda/billetera.
- **T2 (✅ inline, S2, S4, S6)**: ProfileView — avatar letra inicial, edit inline, design limpio Apple, copy wallet, confirmación modal.
- **T3 (✅ inline, S5)**: Animación verified-pulse en App.tsx cuando total cambia.
- **T4 (✅ inline, S3, S4)**: CSS responsive + bottom nav class con bordes rounded.
- **T5 (✅ inline, S7)**: Hints Open Payments en ProfileView.

## Log

**L1** (usuario): Perfil mejorado registro simpl, responsive, nav macOS, animaciones sutiles.

**L2** (revisión): "No estás respetando design.md, Apple Design limpio, nada de emojis, nada complicado, degradados feos".

**L3** (implementación v2 - SIMPLIFICADO):
- OnboardingView: paso 2 minimalista, solo campos necesarios, sin selector emojis
- ProfileView: avatar letra inicial (sin emojis), tarjeta billetera limpia, edit inline, modal confirmación borrar
- Design: blanco limpio, sin gradientes en tarjetas (solo bg sólido + shadow sutilísima)
- Nav bar: clase `.bottom-nav` con blur, bordes redondeados mobile, safe-area respetadas
- Animaciones: @verified-pulse suave, 600ms, scale + opacity solo
- Validación: TypeScript passes, build passes
