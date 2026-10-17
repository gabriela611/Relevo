# RELEVO — Frontend responsive, design system and Open Payments boundary
Objective: improve the frontend responsive experience and organize its visual system while preserving an explicit, testable boundary with the real Open Payments backend. This plan does not claim simulated flows are live payments. Branch: `feat/frontend-design-system`.
Delivery: `ask-on-risk`; forecast to be recalculated after the file layout is approved. No source files are moved by this planning update. Runner: `npm test`, `npm run typecheck`, `npm run build --workspace=frontend`, `npm run lint --workspace=frontend`, and browser/device checks when available.

## Specs

- **S1:** “Primero construye los componentes reutilizables y después las pantallas en el orden del MVP.” Implement semantic tokens, reusable buttons, navigation, status, empty-state and amount controls. Structural and component tests.
- **S2:** “Aplicación inicial en español; inglés preparado con claves i18n.” Spanish-first UI; keyed strings and regional formatting. Do not advertise an untranslated language switch.
- **S3:** “Al abrir la app se identifican inmediatamente `Cobrar` y `Pagar`.” Build responsive home, onboarding, setup, amount entry, history and account surfaces with working local navigation. Check 360 and 390 px plus desktop.
- **S4:** “No inventes wallets, balances ni medios de pago que no hayan sido integrados.” No fabricated currency, quote, receipt, financial totals or offline readiness. The current backend simulator is not an eligible integration. Setup, QR creation, payment and receipt verification must clearly explain their unavailable prerequisites, without success claims.
- **S5:** “internamente almacenar cantidades en unidades menores enteras según el assetScale; no confiar en representación decimal de pantalla.” Provide tested integer-based amount utilities for a future resolved wallet; do not choose a currency/scale for an unconnected wallet.
- **S6:** “Al utilizar herramientas de IA en el repositorio, registra en `AI_USAGE.md` qué herramientas se usaron y para qué, y conserva los prompts reales según la política del hackatón. No fabriques registros retroactivos.” Archive the exact runtime user message, design source and current evidence.
- **S7:** “actualiza ese plan y organiza los nuevos archivos que creamos, la division de css y cosas como esas” Define an explicit frontend file organization before implementation, with CSS responsibilities separated by layer and feature.
- **S8:** “que sea acorde a la docuemtnacion de open payments para que la conexion backend sea optima” Keep frontend payment states and API adapters aligned with the documented Open Payments sequence: wallet resolution, incoming payment, quote, interactive grant, callback, outgoing payment, received-amount verification and signed receipt. The frontend must never invent quote, wallet, balance or payment-success data.
- **S9:** “Qué herramienta(s) de IA usaron... En qué parte del proyecto se usaron... Especificar los archivos en los que se usó mínima o ninguna IA” Update `AI_USAGE.md` and `/prompts` with the real prompt for this planning session, the tool usage, the known provenance gaps, paid-tool credit placeholders and explicit human verification responsibilities.

Full visual and functional requirements remain in [design.md](../../design.md), [the exact prompt](../../prompts/004-frontend-design.md), and [MVP tracking](mvp.md). This frontend work does not mark backend payment, offline signing, replay protection or reconciliation as implemented. No separate PRD file exists in the inspected root; README, ARCHITECTURE and prompt 001 supply existing functional context.

## Target file organization

The following is the target organization for the next implementation tasks. Until the corresponding task is implemented, existing files remain in place.

```text
frontend/
├── index.html                         # PWA metadata, viewport and theme colors
├── public/                            # manifest, service worker and static assets
└── src/
    ├── App.tsx                        # route shell and composition only
    ├── app/
    │   ├── routes.ts                  # route definitions and route resolution
    │   ├── appState.ts                # online state and session-level UI state
    │   └── navigation.ts              # navigation actions and route transitions
    ├── components/                    # reusable visual primitives
    │   ├── buttons/                   # primary, lime and secondary actions
    │   ├── feedback/                  # status, offline, empty and error states
    │   ├── navigation/                # header, bottom nav and desktop sidebar
    │   ├── payment/                   # amount, numpad, quote, QR and timeline UI
    │   └── index.ts                   # public component barrel
    ├── features/
    │   ├── home/                      # home composition and activity summary
    │   ├── collect/                   # create sale request and show sale QR
    │   ├── pay/                       # scan sale, quote and authorization states
    │   ├── verification/              # receipt scan and offline verification result
    │   ├── activity/                  # movements and transaction detail
    │   └── account/                   # wallet/profile/settings surfaces
    ├── services/
    │   ├── apiClient.ts               # fetch, API errors and typed transport only
    │   ├── openPaymentsApi.ts         # frontend mapping to backend endpoints only
    │   └── connectivity.ts             # online/offline browser events
    ├── domain/
    │   ├── paymentStates.ts           # state labels and presentation rules
    │   ├── amounts.ts                 # display adapters over integer minor units
    │   └── qr.ts                      # frontend QR parsing/encoding adapters
    ├── storage/                       # IndexedDB/local persistence boundary
    ├── copy/                          # Spanish keys, future i18n structure
    └── styles/
        ├── tokens.css                 # semantic colors, type, spacing, radii, motion
        ├── base.css                   # reset, body, viewport, safe areas, controls
        ├── layout.css                 # app shell, mobile/tablet/desktop grids
        ├── components.css              # shared visual primitives and states
        ├── utilities.css               # small intentional utilities only
        └── reduced-motion.css          # reduced-motion overrides
```

CSS responsibility rules:

- `tokens.css` contains values, not component selectors.
- `base.css` owns global browser behavior: tap highlight, text sizing, overscroll, focus defaults and safe-area primitives.
- `layout.css` owns breakpoints and shell composition; feature files must not redefine desktop shell behavior.
- `components.css` owns shared button, chip, card, QR and status primitives.
- Feature-specific styles stay beside the feature only when Tailwind classes cannot express the behavior clearly.
- Avoid new global CSS for one screen. Prefer a component variant or a feature-local class.
- No `transition-all`; animate explicit properties only.
- Hover styles must be gated by input capability; touch feedback uses `:active`.

Current-to-target migration map:

| Current path | Target responsibility | Migration rule |
| --- | --- | --- |
| `src/model.ts` | `src/domain/amounts.ts`, `src/domain/paymentStates.ts`, `src/app/routes.ts` | Split by responsibility; preserve public behavior with tests before deleting the old file |
| `src/copy.ts` | `src/copy/index.ts` | Keep Spanish keys stable; add locale boundaries without exposing an unfinished language switch |
| `src/storage.ts` | `src/storage/indexedDb.ts` and `src/storage/merchantProfile.ts` | Separate persistence by data boundary; keep receipt redemption and sale idempotency intact |
| `src/components/*.tsx` | `src/components/<category>/` | Move only after imports and barrel exports are covered by build/tests |
| `src/views/*.tsx` | `src/features/<feature>/` | Keep feature behavior, copy and tests together; do not split a flow by visual file alone |
| `src/index.css` | `src/styles/tokens.css`, `base.css`, `layout.css` | Extract in layers, then leave one import entrypoint in `main.tsx` |
| `src/App.css` | `src/styles/components.css`, `utilities.css`, feature-local styles | Remove global rules that only serve one view; preserve only shared behavior |

The migration is not a cosmetic rename. Each move must leave the application buildable, preserve route behavior and be recorded in the task log with the exact files moved.

## Open Payments integration boundary

The frontend must consume backend facts rather than reproduce Open Payments logic. The backend remains responsible for credentials, wallet discovery, grants, callback validation, outgoing payment creation, polling the incoming payment and signing receipts.

| Backend fact | Frontend state | UI rule |
| --- | --- | --- |
| Sale request created | `LOCAL_DRAFT` / `AWAITING_PAYMENT` | May show and share a sale QR; never show paid |
| Wallet metadata resolved | `wallet_ready` | Show asset code/scale only when returned by the wallet |
| Quote returned | `quote_ready` | Show receive amount, debit amount, fees and expiry from the response only |
| Interactive grant pending | `AWAITING_CONSENT` | Explain that authorization happens in the wallet and redirect externally |
| Callback/outgoing processing | `PROCESSING` | Show progress and retry/status refresh; no success check |
| Incoming amount verified | `SERVER_VERIFIED` | Show server verification and receipt availability |
| Signed receipt verified locally | `OFFLINE_RECEIPT_VERIFIED` | Show offline verification, distinct from reconciliation |
| Provider sync confirmed | `RECONCILED` | Show reconciliation only when backend confirms it |
| Simulator response | `SIMULATION` | Persistent visible simulation label; never present as live money |

Concrete frontend adapter map from [`docs/API.md`](../../docs/API.md):

| Adapter | Endpoint(s) | Consumer | Required frontend behavior |
| --- | --- | --- | --- |
| `getHealth()` | `GET /api/health` | app shell, every route | Render `LIVE · Interledger Test Wallet` or `SIMULATOR` on every screen; never infer mode locally |
| `getConfig()` / `getReceiptKey()` | `GET /api/config`, `GET /api/receipt-key` | onboarding, account, offline verification | Pin the key while online; expose readiness only after the required values are stored |
| `createSale()` / `getSale()` / `listSales()` | `POST /api/sales`, `GET /api/sales`, `GET /api/sales/:saleId` | collect, home, activity | Preserve idempotent sale identity and backend status; a created sale is not paid |
| `resolveWallet()` | `POST /api/wallet/resolve` | setup, account, quote preparation | Display only returned `assetCode`, `assetScale` and wallet metadata |
| `createQuote()` | `POST /api/payments/quote` | pay | Display exact quote values; handle `409` already paid and `410` expired |
| `authorizeQuote()` | `POST /api/payments/authorize` | pay | Redirect only to the backend-provided wallet URL; on requote, replace the old breakdown |
| `getPayment()` / callback parser | `GET /api/payments/:paymentId`, callback redirect params | pay status | Map `AUTHORIZATION_PENDING`, `PROCESSING`, `FAILED` and callback reasons without fabricating success |
| `verifyPayment()` | `POST /api/payments/verify` | pay result | Poll only while processing; show success only after `PAYMENT_VERIFIED` |
| `getReceipt()` | `GET /api/receipts/:saleId` | buyer receipt | Encode only the backend-signed receipt into the QR |
| `syncOfflineRecords()` | `POST /api/sync` | account/connectivity | Show accepted and rejected records; do not silently discard mode/signature rejections |

Required API work before final visual polish:

1. Inventory the existing backend routes in `docs/API.md` and map each to a typed frontend adapter.
2. Keep `openPaymentsApi.ts` free of wallet credentials, SDK calls and quote calculations.
3. Pass integer amount strings plus `assetScale`; never use floating-point values for validity decisions.
4. Represent unavailable quote data as unavailable, not as a guessed exchange rate.
5. Preserve error codes and actionable backend messages for authorization, callback, timeout, asset mismatch and insufficient received amount.
6. Keep simulator mode explicit in every response and visual state.

Open Payments preparation gate:

- Before implementing or changing the live payment adapter, the team must complete either the Platzi Open Payments course or review the official Open Payments Guide, as required by the hackathon policy.
- The implementation must be checked against the official Spanish documentation at `https://openpayments.dev/es/` and the SDK guide at `https://openpayments.dev/es/sdk/before-you-begin/`.
- The backend remains the sole owner of credentials, wallet discovery, GNAP grants, callback hash validation, outgoing payment creation, incoming-payment polling and receipt signing.
- The frontend integration task is not complete until a live smoke test demonstrates the documented path and the UI handles its pending, rejected, expired and provider-error states.

## Tasks

| ID | Specs | Route / reason | Status | Commit / evidence |
| --- | --- | --- | --- | --- |
| T1 | S1, S2, S6 | inline; existing starter understood, no independent writers needed | Completed | Tokens, components, texts and 8 tests passing; build clean |
| T2 | S7 | inline; documentation and file-boundary planning | Completed | Target organization and CSS responsibilities added; no source moves |
| T3 | S8 | inline; backend/frontend contract mapping | Pending | API inventory and typed adapter map required before payment UI changes |
| T4 | S3, S4, S5, S7 | inline; responsive shell and shared CSS layers | Pending | Mobile 360/390, tablet and desktop layouts; no fabricated financial state |
| T5 | S3, S4, S5, S8 | inline; home, collect and payment state surfaces | Pending | Backend-derived data only; simulator visibly labeled |
| T6 | S3, S4, S8 | inline; scanner, receipt and verification surfaces | Pending | Offline verification distinct from online reconciliation |
| T7 | S1–S9 | inline focused tests; delegated long build/device verification if required | Pending | RED/GREEN evidence, build, lint, browser and hardware checks |
| T8 | S3, S4, S7, S8 | inline; Impeccable audit and frontend simplification | Completed | QR centered, technical links/demo payloads removed from public UI, wallet-derived currency retained, regional amount grouping added, motion/reduced-motion added, build/lint/tests clean |


## Log

### L1 — Original request, 2026-10-16 (verbatim)

sigamos con el frontend, # RELEVO — Design System & UX

### L2 — Planning correction, 2026-10-16 (verbatim)

sigue las indicacionesd euso de IA y haz un plan para mejorar el responsive y el diseño de frontend, usa la skillde impecable, las guias de vercel y https://github.com/emilkowalski/skills/tree/main/skills

### L3 — Current request, 2026-10-16 (verbatim)

actualiza ese plan y organiza los nuevos archivos que creamos, la division de css y cosas como esas, no olvides seguir esto Política de IA1. Se permite el uso de herramientas de IA
Los participantes pueden usar herramientas de IA (por ejemplo, ChatGPT, Claude, GitHub Copilot, Cursor, Gemini, entre otras) durante todo el hackatón. La IA puede usarse para programar frontend y backend, depurar código, investigar, diseñar o redactar documentación, según lo requiera el proyecto del hackatón.


2. Se requiere divulgar su uso
Cada equipo debe agregar un archivo llamado AI_USAGE.md en la raíz de su repositorio de GitHub. Este archivo debe indicar:


Qué herramienta(s) de IA usaron. Si usaron una versión pagada, indiquen cuántos créditos consumieron.
En qué parte del proyecto se usaron (archivos, funciones o componentes específicos), o bien mencionar que se usaron en todo el proyecto, si no se escribió ningún archivo sin ayuda de IA.
Especificar los archivos en los que se usó mínima o ninguna IA, por ejemplo, el archivo de servicio de Open Payments.
Example: AI_USAGE.md
# AI Usage Disclosure


## Tools Used


* ChatGPT (GPT-4o)


* Claude


## Where and How We Used AI


### 1. Backend – Payment flow (`/src/api/open-payments.ts`)


* Used Claude to scaffold the initial Open Payments flow, creating incoming and outgoing payments, as well as quote creation.


* Reviewed and rewrote error handling ourselves after testing revealed the AI's version didn't handle grants correctly.


### 2. Frontend – Donation platform UI (`/src/components/Donation.tsx`)


* Used Claude to generate all design and frontend pages and components


### 3. Documentation – README setup instructions


* Used ChatGPT to draft the initial README structure.


* Edited by hand to match our actual setup steps and fix inaccurate install commands.


## What We Did Ourselves


* Testing and verification of all AI-suggested code


## Prompt Log


See `/prompts/backend-payments.md` for the full list of prompts used to generate the open payments flow code.

y que sea acorde a la docuemtnacion de open payments para que la conexion backend sea optima

### L4 — Frontend audit and simplification, 2026-10-16 (verbatim)

listo, ahora audita con impecable para que tengas una referencia de cambios, centra ese icono de qr, hay cosas que cosnidero que no deberian verse ni al ser un mvp, como link de interledger y asi, debe estar tood simplficacado para nuestro publico objetivo, usuarios de todo el mundo que quieran pagar y comerciantes de regiones donde la estabilidad del internet varia o solo lo tienen pocas veces a la semana, si venden artesanias, lo ideal es que el flujo sea lo más sencillo posible, que la divisea sea automatica por ubicacion de quien desea vender y todo sea muy sencillo, pon las comas de miles como en latam autmaticas, animaciones bonitas entre cada cosa, usa las skill que tenemos ya instaladas

> **Pay across currencies. Verify without internet.**  
> Diseño del MVP · Open Payments / Interledger · 16 de octubre de 2026

## 0. Qué estamos diseñando

RELEVO es una PWA para cobrar y pagar usando billeteras compatibles con **Open Payments**, aunque el vendedor no tenga datos móviles. El vendedor genera un QR sin conexión; el comprador, que **sí tiene internet**, paga y recibe un comprobante firmado. El vendedor verifica ese comprobante en su teléfono, offline.

La identidad visual se inspira en la referencia compartida: **onboarding morado expresivo**, interfaz financiera **blanca, limpia y espaciosa**, tarjetas **verde lima y verde bosque**, acentos **lavanda**, formas geométricas grandes y un teclado de pago lavanda con esquinas muy suaves.

**Regla de diseño:** que se sienta como una fintech moderna pero que Doña Arepas pueda entenderla en menos de 10 segundos. Una pantalla = una decisión importante.

---

## 1. Dirección artística

### Sensación de marca

- **Simple, confiable y un poco atrevida.** No parecerse a una app bancaria tradicional.
- **Editorial y amigable:** números grandes, pocos textos, muchísimo aire entre elementos.
- **Contraste intencional:** páginas de marca moradas; páginas de uso diario blancas.
- **Movimiento / relevo:** las figuras de la marca parecen pasarse algo de una a otra, como dos personas intercambiando valor.
- **Local pero internacional:** preparada para español e inglés; monedas y formatos dinámicos.

### Qué conservar de la referencia

1. Splash/onboarding morado oscuro con arte abstracto lima y crema.
2. Home blanco con tarjetas horizontales grandes, encabezados simples y listas compactas.
3. Acciones rápidas en formas redondas.
4. Pantalla para introducir monto con teclado lavanda de botones orgánicos.
5. Bordes suaves, miniavatares o iniciales y navegación inferior pequeña.
6. Detalles geométricos sutiles al fondo: líneas quebradas finas y bloques angulares.

### Qué NO copiar literalmente

- No usar el logo, el nombre ni ilustraciones idénticas a la app de referencia.
- No poner tarjetas VISA, saldo bancario o números de tarjeta ficticios: RELEVO **no es banco ni custodia dinero**.
- No saturar el home con estadísticas, productos financieros o gráficos innecesarios.
- No usar morado y lima con igual fuerza en todas las pantallas: el acento debe guiar la atención.

---

## 2. Identidad visual

### Paleta

| Token | Hex | Uso |
|---|---|---|
| `brand.violet.900` | `#260F61` | Onboarding, botón principal, superficies de marca |
| `brand.violet.700` | `#5634A3` | Elementos activos, encabezados especiales |
| `brand.lime.400` | `#CFFA86` | Tarjetas destacadas, énfasis, botón secundario |
| `brand.lime.100` | `#F0FBD9` | Selecciones y fondos de apoyo |
| `brand.lavender.200` | `#DFD2FF` | Teclado numérico y chips |
| `brand.lavender.100` | `#F2ECFF` | Fondos sutiles y tarjetas informativas |
| `brand.cream` | `#FFF7E8` | Geometrías de onboarding |
| `brand.forest` | `#174F3A` | Pagos verificados, iconos financieros |
| `neutral.ink` | `#17151D` | Texto principal |
| `neutral.muted` | `#797580` | Texto secundario |
| `neutral.border` | `#EAE8EF` | Separadores y bordes discretos |
| `neutral.canvas` | `#FFFFFF` | Fondo de aplicación |
| `neutral.soft` | `#F9F8FC` | Superficies secundarias |
| `status.success` | `#177454` | Confirmación positiva |
| `status.warning` | `#A86614` | Pendiente, no pagado |
| `status.danger` | `#C73E55` | Fallo, firma inválida |

**Uso recomendado:** 75% blanco/neutros, 15% violeta/lavanda, 10% lima/colores de estado. Los colores de estado no deben depender solo del color: incluir texto e icono.

### Tipografía

- Principal: **Geist Sans**. Alternativas: **Inter** o **Manrope**.
- Números: cifras tabulares (`font-variant-numeric: tabular-nums`).
- Hero onboarding: **38–48 px / semibold**, tracking ligeramente negativo.
- Título de pantalla: **24–30 px / semibold**.
- Monto principal: **34–42 px / semibold**.
- Subtítulo y cuerpo: **14–16 px / regular**.
- Labels, fechas y metadatos: **12–13 px**, respetando contraste.
- Evitar texto en mayúsculas sostenidas, salvo chips cortos.

### Logo

**RELEVO** en wordmark sencillo, minúsculas o mayúsculas según composición; preferir `Relevo` en la app y `RELEVO` para piezas de marca. Acompañar con símbolo original de **dos formas angulares redondeadas que se transfieren un bloque**. Debe funcionar a 24 px, sin degradados ni detalles diminutos.

Variantes: violeta sobre blanco, lima sobre violeta, blanco sobre violeta y monocromo.

### Formas e ilustración

- Geometrías planas o 3D moderado: rombos abiertos, flechas quebradas, cintas cruzadas.
- Bordes redondeados, grandes, pero con algunos cortes angulares para personalidad.
- En onboarding pueden atravesar la pantalla; dentro de la app solo decoran tarjetas grandes.
- Prohibidos gráficos de monedas girando, chains, blockchain o efectos de gaming.

---

## 3. Principios de UX

1. **El monto antes que el protocolo.** El usuario nunca debe entender GNAP, incoming payment o quote para usar la app.
2. **Offline explícito, no alarmista.** «Sin datos · puedes seguir cobrando» cuando ya se configuró el dispositivo.
3. **No mentir sobre el dinero.** «Solicitud creada», «Pago en proceso», «Recibo validado offline» y «Pago conciliado» son estados distintos.
4. **Vendedor primero.** Grandes botones `Cobrar` y `Pagar`; pago y lectura de QR en menos pasos.
5. **Seguridad visible sin jerga.** Informar por qué se aceptó un recibo y cómo saber si corresponde a esa venta.
6. **Nunca mostrar saldo inventado.** Si la wallet no expone saldo, mostrar actividad y pagos verificados, no «Balance disponible».
7. **Una mano y a plena luz.** Controles grandes, contraste fuerte, cámara de QR fácil de abrir.
8. **No dependemos de Bluetooth ni de NFC en el MVP.** Solo QR y red para el comprador.

---

## 4. Navegación general

**Mobile (barra inferior persistente, excepto durante escaneo, consentimiento externo y confirmación a pantalla completa):**

- `Inicio` (casa)
- `Movimientos` (reloj / lista)
- `Escanear` (botón central destacado violeta, abre lector QR)
- `Cuenta` (usuario / wallet)

El home tiene dos CTAs evidentes: **Cobrar** (lima) y **Pagar** (violeta). No esconderlos en menús. En escritorio, convertir barra inferior en navegación lateral discreta.

### Roles

Una persona puede **cobrar y pagar** desde la misma cuenta. No inventar roles bloqueantes «turista» vs. «vendedor». Cambiar solo los flujos según la acción elegida.

---

## 5. Pantallas — diseño y comportamiento

### 01 · Splash / onboarding — EXPRESIVO

**Fondo:** `brand.violet.900` a pantalla completa. 1–2 grandes figuras geométricas verde lima y crema en diagonal, parcialmente fuera de pantalla. Líneas quebradas muy delgadas en lavanda.

**Composición:** símbolo y `Relevo` arriba; hero en el tercio medio-bajo; botón blanco o lima pill en parte inferior.

**Copy principal:**

> Cobra en cualquier moneda.  
> Comprueba sin internet.

**Copy secundario:**

> Un QR para cobrar. Otro para saber que sí llegó.

**CTA:** `Empezar` → flecha. Secundario: `Ya tengo cuenta`.

El onboarding no debe utilizar imágenes de bancos o tarjetas. Puede ilustrar dos teléfonos intercambiando una figura geométrica o dos QR estilizados.

### 02 · Configuración inicial — SIMPLE

- Campo `Dirección de tu wallet` (URL wallet address).
- Mostrar moneda soportada y proveedor si realmente se obtiene de la wallet.
- Botón `Conectar billetera`.
- Paso de autorización (consentimiento GNAP) si aplica; nunca pedir contraseña en nuestra UI.
- Aviso: `Haz esta configuración con internet. Después podrás generar cobros sin datos.`
- Estado de preparado offline: `Listo para cobrar sin conexión` solo cuando están descargados PWA, wallet vinculada y claves de verificación.

**Estado fallido:** «No pudimos preparar el modo sin conexión. Intenta otra vez cuando tengas internet».

### 03 · Home — CALMO

Encabezado:

- `Hola, Marta` (o `Hola` si no tenemos nombre).
- Subtexto corto: `Tus cobros, sin complicaciones.`
- Derecha: ícono de conexión (con etiqueta accesible) y avatar.

**Tarjeta hero** (lima, con arte geométrico leve):

- Label: `Cobros verificados hoy`.
- Monto: total confirmado y conciliado de ventas del día, si hay datos; de lo contrario `Aún no hay cobros verificados`.
- Pequeña línea secundaria: `No es el saldo de tu banco` para evitar confusión si mostramos totales.

**Acciones rápidas** (círculos tipo referencia):

1. `Cobrar` — lima, icono QR.
2. `Pagar` — violeta, icono flecha.
3. `Escanear` — lavanda, icono cámara.

**Sección `Últimos movimientos`:** filas simples con nombre o referencia, importe, fecha y chip `Verificado / Pendiente / Fallido`.

**No incluir:** tarjetas VISA falsas, inversiones, scoring, criptoportafolio, gráficos complejos.

### 04 · Crear cobro — TECLADO LAVANDA

Referencia principal: tercera pantalla del ejemplo visual.

- Encabezado `Nuevo cobro` y botón cerrar.
- Valor grande centrado, ej. `8.000` + selector `COP` **solo si la wallet lo soporta**.
- Campo opcional `¿Qué vendiste?` (ej. `Arepa con queso`).
- Teclado propio de 3 columnas, botones lavanda con esquinas muy redondeadas, separación limpia y feedback háptico si está disponible.
- Botón violeta profundo `Crear QR`.

**Offline:** mostrar chip `Sin internet · puedes crear el cobro`.

**Regla de importe:** internamente almacenar cantidades en unidades menores enteras según el assetScale; no confiar en representación decimal de pantalla.

### 05 · Cobro listo — QR OFFLINE

- Fondo blanco, encabezado `Muestra este QR`.
- Tarjeta blanca limpia con borde sutil y QR negro de alto contraste (quiet zone incluida).
- Debajo: `8.000 COP` y `Arepa con queso`.
- Estado claro `Esperando pago` en ámbar.
- Mensaje: `El cliente necesita internet para pagar. Tú puedes seguir sin datos.`
- Acciones: `Verificar recibo` (CTA principal, abre cámara), `Compartir` y `Cancelar venta`.
- `ID de venta`: visible en detalle, sin sobrecargar QR screen.

El QR de cobro contiene `saleId`, destinatario, moneda, importe, versión y firma del vendedor; **jamás** secretos ni tokens. Si no se pudo generar la firma local, bloquear el flujo y explicar por qué.

### 06 · Escanear y revisar — COMPRADOR

- Cámara a pantalla completa con marco cuadrado de esquinas suaves.
- Cabecera: `Escanea el QR del comercio`.
- Al leer: tarjeta resumen `Pagar a Marta`, `8.000 COP`, descripción.
- Control de moneda debitada si la wallet ofrece más de un activo.
- CTA: `Consultar conversión`.
- Sin red: `Para completar el pago necesitas conexión.` Nunca mostrar como «Pagado».

### 07 · Cotización y autorización — MULTIDIVISA

Diseño limpio de **dos tarjetas apiladas o conectadas**:

- `El comercio recibe`: monto fijo y moneda del vendedor.
- Flecha/relé morada.
- `Tú pagas`: cantidad cotizada, moneda del comprador.
- `Conversión y comisiones`: valores reales obtenidos de la quote; si faltan, indicar `No disponible`.
- Texto `La conversión puede cambiar si la cotización vence`.
- CTA violeta `Autorizar pago` → redirección de consentimiento GNAP de la wallet.

**Nunca** usar conversiones inventadas o hacer creer que COP está disponible sin verificarlo en Test Wallet. Si no existe ruta compatible, mostrar `Estas monedas no pueden conectarse por ahora` y ofrecer regresar.

### 08 · Procesando / resultado — COMPRADOR

1. `Autorización pendiente`: hasta que el usuario apruebe el grant.
2. `Estamos confirmando`: no mostrar éxito hasta validar el incoming payment.
3. `Pago verificado`: solo tras revisar `receivedAmount`, moneda, destinatario y `saleId` contra nuestra transacción.
4. `Pago fallido`: proporcionar reintento seguro y no duplicar operaciones.

Evitar loaders infinitos; ofrecer volver a consultar estado. Cada transacción tiene identificador único e idempotencia del lado servidor.

### 09 · Recibo firmado — COMPRADOR

- Pantalla celebratoria pero sobria: check verde y título `Pago verificado`.
- QR de comprobante firmado, centrado y muy contrastado.
- Texto destacado: `Muéstrale este QR al vendedor`.
- Mostrar importe recibido, comercio y referencia de venta.
- Microcopy: `El vendedor puede comprobarlo sin internet.`

El código representa un **recibo firmado por el backend después de verificar el pago**, no una afirmación generada por el teléfono comprador.

### 10 · Verificar recibo — VENDEDOR OFFLINE

- Cámara QR en modo desconectado.
- Verificar criptográficamente la firma con clave pública anclada en la instalación previa, comparar `saleId`, wallet del vendedor, importe, moneda y uso previo.
- Resultado positivo: icono check verde grande, título `Recibo validado sin internet`, subtítulo `RELEVO verificó este pago. Se sincronizará al recuperar señal.`
- Resultado negativo: icono rojo, título `No podemos validar este recibo`, detalle entendible `Es de otra venta / Fue modificado / Ya se utilizó / No es una firma reconocida`.

**Distinción imprescindible:** el recibo validado offline prueba que RELEVO emitió esa constancia; la conciliación online posterior verifica de nuevo el estado del proveedor. No decir `Saldo bancario disponible`.

### 11 · Actividad e historial

- Tabs `Todos`, `Pendientes`, `Verificados`.
- Fecha, comercio/cliente, moneda original, importe recibido, estado y referencia.
- Al tocar: detalle de operación + timeline `Cobro creado → Autorizado → Verificado por servidor → Recibo verificado offline → Sincronizado`.
- Offline: banner pequeño `Viendo registros guardados en este dispositivo`.
- Cuando vuelve internet, refrescar conciliación; conservar historial de cambios sin falsificar estados previos.

### 12 · Cuenta / ajustes

- Wallet address vinculada (truncada + copiar).
- Moneda de recepción real.
- Estado de `Preparado para usar sin conexión`.
- Idioma ES / EN.
- Ayuda breve: `¿Qué puedo hacer sin internet?`.
- Aviso de privacidad y enlaces de código abierto.
- No mostrar funcionalidades no construidas.

---

## 6. Componentes reutilizables

| Componente | Reglas |
|---|---|
| `PrimaryButton` | Alto 52–56 px, fondo violeta, texto blanco, radio 999 px |
| `LimeButton` | Alto 52–56 px, fondo lima, texto violeta/negro |
| `IconAction` | Circular 56–64 px, icono 22–24 px, label debajo |
| `AmountDisplay` | Números tabulares grandes, ISO de moneda separado, sin ambigüedad |
| `Numpad` | 3 × 4 botones lavanda redondeados, `.` y borrar, objetivos táctiles ≥44 px |
| `WalletCard` | Sin imitar tarjeta de crédito; dirección y moneda visibles |
| `TransactionRow` | Referencia, fecha, monto, estado con icono + texto |
| `StatusChip` | `Pendiente`, `Procesando`, `Verificado`, `Fallido`, `Sin conexión` |
| `QRPanel` | QR de alto contraste con quiet zone, tamaño 240–300 px si cabe |
| `QuoteBreakdown` | Monto recibido fijo, monto debitado, fees, FX, vencimiento |
| `OfflineBanner` | Mensaje breve, nunca bloquea crear un QR ya preparado |
| `VerificationResult` | Éxito/error grande y explicativo, accesible sin color |
| `Timeline` | Estados financieros sin marcar falsamente los pasos pendientes |
| `EmptyState` | Título + una acción, sin ilustraciones masivas |

### Spacing / radius / sombras

- Escala espaciado: `4, 8, 12, 16, 20, 24, 32, 40, 48` px.
- Padding horizontal mobile: `20–24px`.
- Cards: `border-radius: 20–24px`.
- Chips: `999px`.
- Inputs: `14–18px`.
- Sombras: casi invisibles (`0 6px 24px rgba(38,15,97,.06)`) y bordes `#EAE8EF`.
- Separación entre secciones: `28–32px`.

### Iconos

Usar Lucide en línea consistente: `qr-code`, `scan-line`, `arrow-up-right`, `arrow-down-left`, `wallet`, `check-circle-2`, `clock-3`, `wifi-off`, `shield-check`, `history`, `user-round`, `x-circle`. Stroke 1.75–2.

---

## 7. Comportamientos y motion

- Transiciones suaves de 160–260 ms; movimiento mínimo.
- Al generar QR: tarjeta aparece con fade y desplazamiento de pocos px.
- Al completar pago: check dibujado / pulsación sutil, sin confeti.
- Al cambiar divisa: actualizar cotización de forma legible, mantener valores anteriores invisibles a fin de evitar confusión.
- Al escanear: feedback visual y vibración corta solo con permiso.
- Respetar `prefers-reduced-motion`.
- Nunca animar un pago como exitoso antes de verificar la recepción.

---

## 8. Accesibilidad y localización

- Contraste WCAG AA para texto y acciones; violeta sobre lima/blanco, no texto blanco sobre lima.
- Objetivos táctiles ≥44 × 44 px.
- Siempre mostrar texto además de iconos y colores de estado.
- Compatibilidad con VoiceOver/TalkBack; anunciar `Recibo validado` y `No se puede verificar`.
- Cámara y QR con instrucciones claras y alternativa de mostrar referencia/código cuando aplique.
- Aplicación inicial en español; inglés preparado con claves i18n.
- Formatos regionales con `Intl.NumberFormat` según moneda y `assetScale`; no asumir que todas las monedas tienen dos decimales.
- Fechas con zona horaria clara en el detalle de pago.
- Permisos de cámara solo al entrar al lector; explicar para qué se usan.

---

## 9. Responsive

**Mobile 360–430 px** es el objetivo principal. Diseñar a 390 × 844 y verificar a 360 × 780. No depender del notch ni colocar acciones bajo el home indicator. Utilizar safe areas CSS.

**Tablet:** centrar contenido en columna de 520 px; historial en ancho extendido cuando sirva.

**Desktop:** `max-width: 1120px`, navegación lateral ligera, home con dos columnas (resumen + historial); el QR puede ir en panel derecho. No estirar una pantalla móvil a todo el ancho.

---

## 10. Pantallas de marketing / showcase

Para presentar la app, usar tres teléfonos como en la referencia:

1. **Izquierdo:** onboarding morado con figura abstracta lima, tagline y botón grande.
2. **Centro:** home blanco, hero de cobros verificados lima y acciones redondas `Cobrar`, `Pagar`, `Escanear`.
3. **Derecho:** nuevo cobro y teclado numérico lavanda; alternativamente, resultado `Recibo validado sin internet` para explicar el diferencial.

Fondo exterior lavanda claro con líneas geométricas finas. Teléfonos negros con perspectiva suave, sombras realistas y mucho espacio. Evitar imágenes de «saldo Visa» u otras marcas bancarias que no formen parte del producto.

---

## 11. Estados reales de negocio y copy permitido

| Estado interno | Copy principal | ¿Muestra check de pago? |
|---|---|---|
| `LOCAL_DRAFT` | `Cobro listo para compartir` | No |
| `AWAITING_PAYMENT` | `Esperando pago` | No |
| `AWAITING_CONSENT` | `Falta autorizar el pago` | No |
| `PROCESSING` | `Estamos verificando el pago` | No |
| `SERVER_VERIFIED` | `Pago verificado por RELEVO` | Sí, después de comprobar fondos recibidos |
| `OFFLINE_RECEIPT_VERIFIED` | `Recibo validado sin internet` | Sí, con aclaración de conciliación pendiente |
| `RECONCILED` | `Pago conciliado` | Sí |
| `FAILED` | `No se completó el pago` | No |
| `EXPIRED` | `Este cobro venció` | No |
| `INVALID_RECEIPT` | `No podemos validar este recibo` | No |

No usar `Transacción confirmada`, `Dinero recibido` o `Saldo disponible` basándose solo en una quote, un grant o una pantalla del comprador. **Ninguna prueba de pago viene de un screenshot.**

---

## 12. Sistema visual — tokens CSS sugeridos

```css
:root {
  --color-brand: #260F61;
  --color-brand-secondary: #5634A3;
  --color-lime: #CFFA86;
  --color-lime-soft: #F0FBD9;
  --color-lavender: #DFD2FF;
  --color-lavender-soft: #F2ECFF;
  --color-cream: #FFF7E8;
  --color-forest: #174F3A;
  --color-text: #17151D;
  --color-muted: #797580;
  --color-border: #EAE8EF;
  --color-bg: #FFFFFF;
  --color-surface: #F9F8FC;
  --color-success: #177454;
  --color-warning: #A86614;
  --color-danger: #C73E55;

  --radius-card: 24px;
  --radius-control: 16px;
  --radius-pill: 999px;
  --shadow-card: 0 6px 24px rgb(38 15 97 / 6%);
}
```

Implementar colores como tokens semánticos (design system), no escribir hexadecimales sueltos en cada componente. Usar modo claro para el MVP; el modo oscuro puede venir después.

---

## 13. Orden de implementación del diseño

| Prioridad | Pantalla / componente | Listo cuando... |
|---|---|---|
| P0 | Tokens, fuentes, iconos, botones y nav | Mismo sistema en todas las vistas |
| P0 | Onboarding / configuración | Preparación offline entendible y verificable |
| P0 | Home + `Cobrar` + teclado | Un usuario crea una venta sin red |
| P0 | QR de cobro + lector QR | Dos dispositivos intercambian la solicitud |
| P0 | Cotización + GNAP + estado | Comprador ve importe real y autoriza en wallet |
| P0 | QR de recibo + lector + validación | Vendedor ve resultado offline correcto |
| P0 | Errores y estados pendientes | Nunca se presenta un pago incompleto como recibido |
| P1 | Historial con sincronización | Los movimientos mantienen estado sin duplicarse |
| P1 | Inglés y responsive desktop | Componentes reutilizados sin romper UX |
| P2 | Microinteracciones refinadas | No distraen ni ocultan estados |

---

## 14. Criterios de aceptación de diseño

- [ ] Al abrir la app se identifican inmediatamente `Cobrar` y `Pagar`.
- [ ] El comerciante preparado puede crear y mostrar QR en modo avión.
- [ ] El comprador ve cuánto entrega y cuánto recibe el vendedor **antes** de autorizar.
- [ ] Si no hay conversión posible, se comunica claramente y no se muestra un valor inventado.
- [ ] Ninguna pantalla confunde permiso, solicitud o cotización con pago ejecutado.
- [ ] El comprobante verificado offline tiene diseño y copy diferentes a `Pago conciliado`.
- [ ] Un recibo alterado, reutilizado o de otra venta muestra rechazo visible.
- [ ] Los QR tienen margen, contraste y tamaño suficientes para ser escaneados entre teléfonos.
- [ ] La UI es cómoda con una mano, a 360 px, y no tapa controles con el teclado.
- [ ] Los colores y tipografías son consistentes; no aparece una interfaz bancaria genérica.
- [ ] Estados accesibles por lector de pantalla y no solo por color.
- [ ] Sin navegación falsa a pantallas inexistentes en el MVP.

---

## 15. Handoff para el agente que implementa

Usa **este `design.md` como fuente de verdad visual** y el PRD del proyecto como fuente de verdad funcional. No inventes wallets, balances ni medios de pago que no hayan sido integrados.

Primero construye los componentes reutilizables y después las pantallas en el orden del MVP. No copies píxel por píxel la referencia: úsala para el contraste de marca morada y lima, la jerarquía tipográfica, las tarjetas espaciosas, los botones redondos y el teclado lavanda. Todo debe tener la identidad **RELEVO**.

Si un componente visual depende de datos financieros, diseña loading, vacío, fallido, pendiente y verificado. **Nunca generes confirmaciones falsas para que una captura de pantalla se vea bonita.** Los mockups pueden tener datos de demostración, claramente marcados como demo.

Al utilizar herramientas de IA en el repositorio, registra en `AI_USAGE.md` qué herramientas se usaron y para qué, y conserva los prompts reales según la política del hackatón. No fabriques registros retroactivos.

**Objetivo final:** una app que se vea premium como la referencia, pero permita resolver la historia en una sola demo: Doña Arepas crea un QR sin datos, un turista paga desde una billetera compatible y ella verifica el recibo firmado sin conectarse.

### L2 — Inspection

Clean baseline `97fe1d0`; frontend is Vite starter. Backend wallet metadata and rates can be fabricated and payment amountReceived is copied from sale.amount. Do not wire that response into trusted UI. No installed node_modules found. RDD effective mode is on by default. Source implementation remains inline; installation/build may be delegated to an available verification worker. No push, PR or deployment authorized.

### L3 — Upstream sync request (literal prompt 005)

`pullea los ultimos cambios de la main y pon lo que nosotros habiamos avanzado`

### L4 — Rebase result

`main` synced with `origin/main` (`098a5ed`, containing backend Open Payments PR #1). `feat/frontend-design-system` rebased cleanly on top without conflicts.

### L5 — Documentation & ODD request (literal prompt 006)

`organiza los docs. sigue las reglas de uso de IA y y empieza por el primer odd`

### L6 — T1 completion evidence

- Tokens semánticos en `frontend/src/index.css` alineados 1:1 con `design.md`.
- Componentes reutilizables implementados en `frontend/src/components/`: `Buttons`, `IconAction`, `AmountDisplay`, `Numpad`, `StatusChip`, `EmptyState`, `OfflineBanner`, `WalletCard`, `TransactionRow`, `BottomNav`, `Header`.
- Catálogo de textos y rutas en español en `copy.ts` y `model.ts` con manejo estricto de unidades enteras sin flotantes y estados financieros verídicos (S4).
- Prompts 004, 005 y 006 registrados íntegros y referenciados en `prompts/README.md`.
- `AI_USAGE.md` actualizado con herramientas, modelo, alcance y comandos de validación.
- Validación: 8/8 tests de frontend pasando (`node --test tests/*.test.mjs`), `tsc -b && vite build` completado en <700ms, y suite global `npm test` pasando con 35/35 pruebas en shared (13), backend (14) y frontend (8).
