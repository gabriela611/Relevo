# Uso de inteligencia artificial

Registro parcial y verificable del uso de IA en RELEVO. Última actualización: 2026-10-16. No atribuye a esta sesión el código que ya existía.

## Herramientas y alcance observado

| Herramienta | Uso | Archivos / componentes | Validación |
| --- | --- | --- | --- |
| OpenAI Codex | Diagnóstico y configuración local de memoria Engram | `.engram/config.json` | Guardado y recuperación de memoria comprobados |
| OpenAI Codex | Organización del progreso y documentación de IA | `README.md`, `AI_USAGE.md`, `odd/README.md`, `odd/tasks/mvp.md`, `prompts/*.md`, `.gitignore` | Comprobación estructural; no acredita pruebas funcionales |
| Antigravity (Gemini 3.8 Flash) | Sincronización y rebase con main tras merge de PR #1 | Rama `feat/frontend-design-system`, git tracking | `npm test` (27/27 en shared y backend) |
| Antigravity (Gemini 3.8 Flash) | Sistema de diseño frontend, tokens CSS, componentes base, modelo de montos y estados de pago | `design.md`, `frontend/src/*`, `frontend/tests/*`, `odd/tasks/frontend-design-system.md` | `node --test frontend/tests/model.test.mjs` (5/5) y build `tsc -b && vite build` |
| Antigravity (Gemini 3.8 Flash) | Organización rigurosa de prompts y tracking ODD según política de hackatón | `AI_USAGE.md`, `prompts/004-*.md`, `prompts/005-*.md`, `prompts/006-*.md`, `prompts/README.md`, `odd/README.md` | Verificación de enlaces, integridad de prompts literales y suite de tests |
| Antigravity (Gemini 3.8 Flash) | Implementación de flujos Cobrar (Numpad + QR venta), Pagar (escáner + cotización multidivisa + comprobante), Verificación offline y PWA con Service Worker | `frontend/src/views/*`, `frontend/src/storage.ts`, `frontend/public/manifest.json`, `frontend/public/sw.js`, `frontend/src/App.tsx`, `frontend/tests/views.test.mjs` | `oxlint` 0 errores, `vite build` limpio, `npm test` (38/38 pasando en monorepo) |
| OpenAI Codex (gpt-6-astra; identidad de runtime `gpt-6-astra`) | Revisión del frontend, actualización del plan responsive, organización objetivo de archivos/CSS y mapeo de estados hacia el contrato Open Payments | `odd/tasks/frontend-design-system.md`, `prompts/008-responsive-plan-and-open-payments.md`, `AI_USAGE.md`, `prompts/README.md` | Revisión estructural; no se modificó lógica de aplicación ni se ejecutaron pagos reales |
| OpenAI Codex (gpt-6-astra) | Verificación e instalación de la skill de diseño `impeccable@4.6.0` mediante `npx impeccable install` | `.claude/skills/impeccable/`, `.claude/agents/`, `.claude/settings.local.json`, `prompts/009-install-impeccable.md`, `prompts/README.md` | Instalación confirmada por CLI; `/impeccable init` queda pendiente y no se ejecutó en esta sesión |
| OpenAI Codex (gpt-6-astra) | Auditoría Impeccable y simplificación responsive del frontend: QR centrado, copy sin jerga técnica, eliminación de demos públicas, formato regional de importes, estados honestos y animaciones accesibles | `frontend/src/App.tsx`, `frontend/src/App.css`, `frontend/src/index.css`, `frontend/src/model.ts`, `frontend/src/copy.ts`, `frontend/src/storage.ts`, `frontend/src/components/*`, `frontend/src/views/*`, `frontend/tests/components.test.mjs`, `design.md`, `prompts/010-impeccable-frontend-audit.md` | Impeccable `detect` sobre servidor local; build frontend limpio; lint limpio; 11 tests frontend pasando; no se ejecutaron pagos reales |
| Antigravity (Gemini 3.8 Flash) | Fusión de identidad visual: integración del fondo de A y la R de B de round 1 en SVG vectorial para logotipo, icono de app, favicon PWA y guía de marca | `brand/`, `frontend/public/favicon.svg`, `frontend/src/assets/logo.svg`, `prompts/011-brand-logo-and-icons.md` | Verificación de renderizado SVG, viewBox, escalabilidad multi-resolución y suite de tests |
| Antigravity (Gemini 3.8 Flash) | Refinamiento de la Opción 1: R geométrica continua y unificada sin corte transversal, manteniendo la armonía con el fondo de dos piezas de A | `brand/`, `brand/preview.html`, `frontend/public/favicon.svg`, `frontend/src/assets/logo.svg`, `prompts/012-brand-refinement-whole-r.md` | Validación visual SVG y compatibilidad PWA/web |
| Antigravity (Gemini 3.8 Flash) | Ajuste del App Icon a sangre completa (512x512) sin anidaciones de contenedores ni marcos dobles | `brand/app-icon.svg`, `frontend/public/app-icon.svg`, `frontend/public/favicon.svg`, `prompts/013-app-icon-refinement.md` | Validación de viewBox a sangre completa (`28 28 200 200`) y visualización PWA |
| Antigravity (Gemini 3.8 Flash) | Limpieza de conceptos SVG redundantes, sincronización de favicon/app-icon y profesionalización de README sin emojis | `README.md`, `brand/`, `frontend/public/manifest.json`, `frontend/index.html`, `prompts/014-app-icon-fullbleed-and-readme.md` | Limpieza de archivos temporales, validación de enlaces y suite completa de tests |





- **Modelo exacto:** no expuesto de forma verificable en esta sesión; completar desde el historial de la herramienta si está disponible.
- **Plan de pago y créditos consumidos:** no disponibles para el agente; el responsable debe registrar el plan y consumo reales antes de entregar, si corresponde. No se declara consumo cero.
- **Skills consultadas para esta preparación:** `cognitive-doc-design` y `work-unit-commits`. Son instrucciones auxiliares, no autores ni modelos independientes.
- **Skills y referencias consultadas en esta actualización:** skill local `open-payments`, skill local `cognitive-doc-design`, skill local `work-unit-commits`, skill de proyecto `impeccable@4.6.0`, y las guías externas `mobile-native` y `emil-design-eng` de `emilkowalski/skills`; también se consultó Vercel Geist sobre fundamentos, tipografía y color.
- **Herramientas auxiliares:** Engram para memoria y CodeGraph para consultar la estructura. El índice local de CodeGraph no es un entregable del producto.

## Participación humana y procedencia pendiente

El usuario aportó el brief, las restricciones y las solicitudes registradas en [prompts](prompts/README.md). No se presume que el brief se haya escrito sin asistencia de IA.

`frontend/`, `backend/`, `shared/`, los manifiestos npm, el lockfile, `README.md` y `ARCHITECTURE.md` ya existían antes de esta preparación. Su autoría y uso previo de IA no se han determinado. Esta sesión no modificó el código de la aplicación ni verificó pagos reales.

**Archivos con uso mínimo o nulo de IA:** todavía no identificados por el equipo. No se afirma que el servicio Open Payments ni otro archivo cumpla esa condición sin evidencia.

## Créditos y plan de pago

- OpenAI Codex: el entorno no expone de forma verificable el plan de pago ni créditos consumidos. El responsable debe completar esos datos desde la cuenta o factura real; no se declara consumo cero.
- Antigravity (Gemini 3.8 Flash): el registro anterior no contiene consumo verificable. El responsable debe completar plan y créditos reales si corresponde.

## Antes de entregar

- [ ] Recuperar herramientas, modelos y prompts del trabajo anterior.
- [ ] Identificar contribuciones humanas y archivos con uso mínimo o nulo de IA.
- [ ] Completar el consumo real de créditos de herramientas pagas, si corresponde.
- [ ] Confirmar con evidencia qué trabajo humano se realizó en `backend/src/services/openPayments.ts` y `backend/src/services/gateways/` antes de declarar uso mínimo o nulo de IA; esta sesión no lo infiere.
- [ ] Mantener el registro de prompts completo y revisar que no publique secretos.
- [ ] Revisar, comprender y probar el código asistido; registrar evidencia en ODD.

Los [prompts reales disponibles](prompts/README.md) y el [seguimiento del MVP](odd/tasks/mvp.md) son los registros asociados. Esta declaración sigue la [política oficial de IA](https://interledger.org/hackathon/ai-policy/), consultada el 2026-10-16; los pendientes anteriores impiden declarar cumplimiento completo.

## Sesión red-team: Rediseño ultra-simplificado para personas mayores

| Herramienta | Uso | Archivos / componentes | Validación |
| --- | --- | --- | --- |
| Claude Code (claude-opus-5-5) | Rediseño radical del flujo de registro y perfil: billetera **transparente** (backend-managed, no manual), UI ultra-simplificada para personas mayores, Apple Design limpio sin gradientes complicados | `frontend/src/storage.ts` (StoredMerchant simplificado a {name, currency, language}), `frontend/src/views/OnboardingView.tsx` (2 pasos: intro hero + registro nombre/moneda/idioma), `frontend/src/views/ProfileView.tsx` (display/edit mode limpio), `design.md` (verificación), `odd/tasks/profile-design-system.md` | Verificación: `npm run typecheck` (0 errores), build Vite limpio, modelado sin billetera manual, storage simplificado, OnboardingView + ProfileView sin emojis ni selectores complejos, fonts grandes para personas mayores, contraste alto |
