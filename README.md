# RELEVO

**Pay across currencies. Verify without internet.**

## Estado y seguimiento

Existe una base de código con `frontend/`, `backend/` y `shared/`. Los flujos descritos abajo son el objetivo del MVP: esta preparación documental no ha verificado todavía pagos reales, funcionamiento offline ni reconciliación.

- [Progreso ODD y próximos hitos](odd/tasks/mvp.md)
- [Estructura y ciclo de trabajo](odd/README.md)
- [Registro de prompts reales](prompts/README.md)
- [Uso de IA y datos pendientes de completar](AI_USAGE.md)

**Primero:** demostrar un pago de punta a punta entre test wallets. Después, el QR offline. El comprador y el servidor necesitan internet; la firma acredita lo verificado por Relevo en ese momento, no una garantía bancaria permanente.

**Tipo:** PWA Fintech · Open Payments / Interledger  
**Etapa:** MVP para Hackatón  
**Usuarios:** Pequeños comerciantes, vendedores informales, turistas y personas con conectividad limitada.

---

## 🌟 Visión

RELEVO permite que un comercio reciba pagos de billeteras compatibles con distintas monedas y verifique criptográficamente que recibió el dinero, aunque su dispositivo no tenga conexión a internet.

La plataforma no custodia fondos, no concede crédito y no requiere stablecoins.

---

## ⚠️ El Problema

Los pequeños comerciantes pueden tener dificultades para verificar transferencias cuando la conexión falla. Depender de comprobantes visuales o pantallazos expone al vendedor a fraudes y estafas.

Al mismo tiempo, los compradores que utilizan otra divisa necesitan una experiencia de pago sencilla y una cotización transparente.

---

## 💡 Propuesta de Valor

- **Para comerciantes:** Aceptar cobros digitales y comprobar su recepción sin datos móviles mediante comprobantes firmados digitalmente.
- **Para compradores:** Pagar desde una billetera compatible con Open Payments, con desglose previo del monto debitado y de la moneda recibida.
- **Para comunidades:** Reducir barreras de conectividad y mejorar la confianza en los pagos digitales en economías emergentes y zonas turísticas.

---

## 🏗️ Arquitectura del Sistema

El proyecto está organizado como un **Monorepo** estructurado en tres paquetes principales:

```
relevo/
├── shared/         # Tipos compartidos, motor criptográfico Web Crypto y esquemas QR
│   ├── src/types.ts    # Modelos de venta, cotizaciones, recibos y estados
│   ├── src/crypto.ts   # Criptografía ECDSA P-256 + SHA-256 canónico
│   └── src/qr.ts       # Serialización y verificación offline de comprobantes
├── backend/        # Servidor Node.js + Fastify + SQLite
│   ├── src/services/openPayments.ts   # Integración con Open Payments / Interledger
│   ├── src/services/cryptoService.ts  # Emisión y firma de comprobantes verificables
│   └── src/services/db.ts             # Persistencia SQLite
└── frontend/       # PWA Mobile-First con React, Vite y Tailwind CSS v4
    ├── src/App.tsx     # Flujos principales: Cobrar (Vendedor) y Pagar (Comprador)
    └── vite.config.ts  # Configuración Vite + Tailwind v4
```

---

## 🔐 Protocolo de Verificación Offline

```mermaid
sequenceDiagram
    autonumber
    actor Vendedor as Comercio (Sin Internet)
    actor Comprador as Comprador (Con Internet)
    participant Backend as Backend RELEVO / Open Payments
    participant ILP as Interledger Test Wallet

    Vendedor->>Vendedor: 1. Introduce importe y genera QR de venta firmado localmente
    Comprador->>Vendedor: 2. Escanea QR de venta del comercio
    Comprador->>Backend: 3. Solicita cotización multidivisa (ej: Paga EUR, Comercio recibe USD)
    Backend-->>Comprador: 4. Muestra desglose de conversión y comisiones
    Comprador->>Backend: 5. Autoriza pago vía Open Payments (GNAP)
    Backend->>ILP: 6. Ejecuta Outgoing Payment hacia Incoming Payment del comercio
    ILP-->>Backend: 7. Confirma recepción de fondos (verificación estricta de saldo recibido)
    Backend->>Backend: 8. Firma digitalmente el comprobante con clave privada ECDSA P-256
    Backend-->>Comprador: 9. Emite Comprobante Verificable
    Comprador->>Comprador: 10. Muestra QR del Comprobante Verificable
    Vendedor->>Comprador: 11. Escanea el QR del Comprobante
    Vendedor->>Vendedor: 12. Valida criptográficamente offline (ID venta, importe, divisa y firma ECDSA)
    Note over Vendedor: Firma y datos del recibo validados localmente; conciliación posterior
```

---

## 📊 Estados del Pago

| Estado | Descripción |
| :--- | :--- |
| **Esperando pago** (`WAITING_PAYMENT`) | Venta creada por el comercio y dinero todavía no recibido. Si un intento de pago es rechazado o falla, la venta **vuelve a este estado** para que el comprador pueda reintentar. |
| **Autorización pendiente** (`AUTHORIZATION_PENDING`) | El comprador aún debe consentir el pago mediante GNAP. |
| **Procesando** (`PROCESSING`) | Transferencia iniciada en la red Interledger, pendiente de confirmación. |
| **Pago verificado** (`PAYMENT_VERIFIED`) | Recepción comprobada por el backend en el proveedor Open Payments. |
| **Verificado offline** (`OFFLINE_VERIFIED`) | Comprobante firmado validado localmente en el dispositivo del vendedor sin internet. |
| **Vencida** (`FAILED_OR_EXPIRED`) | La **venta misma** expiró (`expiresAt`) sin pagarse; ya no se puede pagar. Un intento rechazado o fallido no lleva a este estado. |

Cada venta puede tener varios **intentos de pago** con su propio estado (`attemptStatus`: `QUOTED`, `AUTHORIZATION_PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`). La correspondencia con los estados de la venta está en [docs/API.md](docs/API.md#two-status-vocabularies).

> **Regla de Oro de Seguridad:** Nunca debe marcarse una venta como pagada únicamente porque existe una autorización, una captura de pantalla o un recurso marcado como completado sin comprobar su importe realmente recibido.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React, TypeScript, Vite, Tailwind CSS v4, PWA (IndexedDB + Web Crypto).
- **Backend:** Node.js 24, Fastify, `@interledger/open-payments`.
- **Persistencia:** SQLite en backend e IndexedDB en el dispositivo cliente.
- **Criptografía:** Web Crypto API nativa, ECDSA (curva P-256 / secp256r1) y SHA-256 canónico.
- **Infraestructura financiera:** Interledger Test Wallet (Rafiki).

---

## ✅ Verified live

El 2026-10-17 el flujo completo pasó contra la **Interledger Test Wallet** (`OP_MODE=live`):
- Pago entre monedas: comprador en EUR → comercio en USD, con cotización *fixed-receive*.
- Hash de interacción GNAP: `MATCH`.
- Fondos verificados en el incoming payment del comercio antes de firmar.
- Recibo v2 verificado offline (`LIVE_PAYMENT`) solo con la llave pública fijada.
- Un recibo alterado fue rechazado (`INVALID_SIGNATURE`).

Salida completa: [docs/LIVE-TEST-RESULT.md](docs/LIVE-TEST-RESULT.md).

## 🚀 Primeros Pasos (Desarrollo Local)

### Prerrequisitos
- Node.js >= 20 (recomendado Node 24)
- npm >= 10

### Instalación
```bash
npm install
npm run build --workspace=shared          # tipos, criptografía y verificador offline
cp backend/.env.example backend/.env      # y edita los valores
```

### Modo: `OP_MODE` (obligatorio)
El backend **no arranca** sin `OP_MODE` en `backend/.env`, y nunca cambia de modo por su cuenta.

| `OP_MODE` | Qué hace | Badge en la PWA |
|---|---|---|
| `live` | Open Payments real contra la Interledger Test Wallet. Cualquier error de Open Payments se muestra como error: **no hay fallback al simulador**. | `LIVE · Interledger Test Wallet` |
| `simulator` | Mismo flujo en memoria, sin red. Los recibos se firman con `mode: "simulator"` y el verificador del comercio los muestra como **SIMULACIÓN**, nunca como pago real. | `SIMULATOR` |

### Llave de firma de recibos
Los recibos se firman con una llave ECDSA P-256 guardada en `backend/.relevo-backend-keys.json` (ignorado por git). Su `keyId` (huella RFC 7638) queda fijado en cada dispositivo de comercio.

```bash
npm run keys:generate --workspace=backend   # una sola vez; se niega a sobrescribir una llave existente
```

En `live` el backend **se niega a arrancar** si la llave no existe, para no rotarla en silencio. Si la llave cambia, los comercios verán *"Este comercio tiene una llave desactualizada. Conéctate a internet una vez para actualizarla."* hasta que vuelvan a fijar `GET /api/receipt-key`. En `simulator` se crea automáticamente si falta.

### Credenciales Open Payments (modo live)
1. Crea cuentas en https://wallet.interledger-test.dev: una para el **comercio** y otra para el **comprador**, con saldo de prueba.
2. Settings → Developer Keys → genera la llave. Copia el **Key ID** y guarda `private.key` en `backend/` (ignorado por git).
3. En `backend/.env` define `OP_MODE=live`, `OPEN_PAYMENTS_CLIENT_WALLET`, `OPEN_PAYMENTS_KEY_ID`, `OPEN_PAYMENTS_PRIVATE_KEY_PATH=./private.key`, `MERCHANT_WALLET`, `SMOKE_MERCHANT_WALLET` y `SMOKE_BUYER_WALLET`.

### Ejecutar en Desarrollo
```bash
npm run dev:backend    # puerto 3000; imprime "MODE: LIVE · Interledger Test Wallet" o "MODE: SIMULATOR"
npm run dev:frontend   # puerto 5173; proxy de /api al backend
```

### Pruebas
```bash
npm test               # compila shared y corre los tests de shared y backend (simulador, sin red)
npm run typecheck
```

### Smoke test en vivo (sin frontend)
Prueba el flujo real completo desde la terminal: venta → incoming payment del comercio → quote del comprador → autorización interactiva → callback local → outgoing payment → verificación del monto recibido → recibo firmado → verificación offline con `@relevo/shared`.

```bash
npm run smoke:live --workspace=backend
```

Imprime una URL de consentimiento. Ábrela **en un navegador de esta misma máquina**, entra como el comprador y aprueba. Solo muestra ids, estados y montos formateados, nunca tokens ni llaves. Termina con `RESULT: PASS` (exit 0) o `FAIL` (exit 1).

### `STRICT_HASH`: verificación del hash de interacción GNAP
Cuando la billetera devuelve al comprador al callback, incluye un `hash` que el backend recalcula.

- `STRICT_HASH=false` (por defecto): si no coincide, se registra una advertencia y el pago continúa. El token de continuación sigue protegiendo el grant.
- `STRICT_HASH=true`: si no coincide (o falta), el pago se rechaza con `reason=HASH_MISMATCH`.

**Procedimiento:** corre `npm run smoke:live`. Si imprime `hash: MATCH`, cambia a `STRICT_HASH=true` y vuelve a correrlo para confirmar `RESULT: PASS`. Si imprime `hash: MISMATCH`, deja `false` y avisa al equipo de backend.

## 📱 Teléfonos por HTTPS (cámara y service worker)

En un teléfono, `getUserMedia` (cámara para escanear QR) y el service worker **solo funcionan sobre HTTPS**. Basta **un solo túnel**: Vite sirve la PWA y hace de proxy de `/api` (incluido el callback de Open Payments) hacia el backend.

```
teléfono ──HTTPS──> cloudflared ──> Vite :5173 ──/api──> backend :3000
```

1. Instala cloudflared: `winget install --id Cloudflare.cloudflared` (Windows) o `brew install cloudflared` (macOS).
2. Arranca el backend y el frontend (`npm run dev:backend`, `npm run dev:frontend`).
3. Abre el túnel hacia el frontend:
   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```
   Copia la URL `https://<algo>.trycloudflare.com` que imprime.
4. En `backend/.env`:
   ```
   PUBLIC_FRONTEND_URL=https://<algo>.trycloudflare.com
   # PUBLIC_BACKEND_URL se deja vacío: por defecto es igual a PUBLIC_FRONTEND_URL
   ```
   y **reinicia el backend**. Con eso, la redirección después de aprobar en la billetera vuelve a la URL pública y CORS acepta ese origen (además de `localhost:5173`).
5. Abre la URL `https://...trycloudflare.com` en el teléfono.

Notas:
- La URL de un *quick tunnel* cambia cada vez que reinicias cloudflared: actualiza `PUBLIC_FRONTEND_URL` y reinicia el backend.
- Vite ya acepta hosts `*.trycloudflare.com` (`server.allowedHosts` en `frontend/vite.config.ts`).
- Solo si expones el backend por separado (segundo túnel) define `PUBLIC_BACKEND_URL` con su URL pública.
