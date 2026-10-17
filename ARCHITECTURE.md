# Especificación Técnica de Arquitectura: RELEVO

Este documento detalla las decisiones arquitectónicas, modelos de datos, protocolos criptográficos y la integración con Open Payments para el MVP de RELEVO.

---

## 1. Topología del Monorepo

```
relevo/
├── package.json              # Configuración de workspaces (shared, backend, frontend)
├── .gitignore                # Reglas de exclusión para Node, SQLite, env y compilaciones
├── README.md                 # Visión general y guía rápida
├── ARCHITECTURE.md           # Este documento de arquitectura
├── shared/                   # @relevo/shared: Núcleo transversal agnóstico
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── types.ts          # Contratos de datos TypeScript
│       ├── crypto.ts         # Primitivas Web Crypto (ECDSA P-256 + SHA-256)
│       ├── qr.ts             # Recibo v2: firma, QR y validador offline (verifyReceiptOffline)
│       ├── amounts.ts        # Conversión decimal <-> unidades mínimas y comparación exacta (BigInt)
│       └── index.ts          # Punto de entrada exportado
├── backend/                  # @relevo/backend: Orquestador Open Payments y emisor de recibos
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config.ts         # Parámetros de entorno y defaults
│       ├── app.ts            # Rutas REST Fastify (buildServer) — contrato en docs/API.md
│       ├── server.ts         # Arranque del servidor
│       └── services/
│           ├── cryptoService.ts # Llave de firma estable (keyId RFC 7638) y emisión de recibos v2
│           ├── db.ts            # Capa de persistencia SQLite nativa (sales, payments, receipts)
│           ├── openPayments.ts  # Orquestador: quote -> GNAP -> outgoing -> verificación -> recibo
│           └── gateways/
│               ├── live.ts      # Cliente real @interledger/open-payments
│               └── simulator.ts # Mismo flujo en memoria (demo sin credenciales)
└── frontend/                 # @relevo/frontend: Interfaz PWA Mobile-First
    ├── package.json
    ├── vite.config.ts        # Vite + Tailwind CSS v4 + Proxy API
    └── src/                  # Vistas Cobrar y Pagar
```

---

## 2. Protocolo Criptográfico de Verificación Offline

El núcleo de seguridad de RELEVO elimina la necesidad de que el comerciante esté conectado al momento de verificar un pago.

### 2.1 Canonicidad Determinista (`canonicalJson`)
Para prevenir discrepancias de hashing causadas por orden de propiedades o espacios en blanco en JSON, todas las cargas útiles se normalizan mediante serialización recursiva ordenada por clave antes de calcular el digesto SHA-256.

### 2.2 Criptografía de Clave Pública (ECDSA P-256)
- **Generación de Claves:** Claves conformes con el estándar FIPS 186-4 utilizando la curva elíptica `P-256` (secp256r1). Se crean una sola vez con `npm run keys:generate --workspace=backend`; en modo `live` el backend no arranca sin ellas.
- **Firma:** `ECDSA` con función hash `SHA-256`, formato IEEE P1363 (r‖s, 64 bytes), en Base64URL.
- **Compatibilidad:** El backend firma con el mismo código de `shared/src/crypto.ts` (W3C Web Crypto, `crypto.subtle`) que el navegador usa para verificar, por lo que el formato de firma es idéntico en ambos lados.
- **Identificador de llave (`keyId`):** huella RFC 7638 de la llave pública. El dispositivo del comercio la fija desde `GET /api/receipt-key` mientras tiene conexión.

### 2.3 Estructura del Comprobante Verificable v2 (`VerifiedReceipt`)
```typescript
interface VerifiedReceipt {
  version: '2';
  receiptId: string;            // UUID único del comprobante
  saleId: string;               // Enlace con la venta creada en el dispositivo del comercio
  merchantWallet: string;       // Billetera que recibió los fondos
  amountReceived: {             // Leído del incoming payment, en unidades mínimas
    value: string;              // "1500" con assetScale 2 = 15.00
    assetCode: string;
    assetScale: number;
  };
  incomingPaymentId: string;    // Recurso Open Payments del comercio
  outgoingPaymentId: string;    // Recurso Open Payments del comprador
  issuedAt: number;             // Unix ms
  keyId: string;                // Huella RFC 7638 de la llave de firma
  mode: 'live' | 'simulator';   // Un recibo del simulador nunca es dinero real
  payloadDigest: string;        // SHA-256 del contenido canónico
  backendSignature: string;     // ECDSA P-256, IEEE P1363, Base64URL
}
```
Todos los campos salvo `payloadDigest` y `backendSignature` están firmados. El recibo **no contiene datos del comprador**, porque se muestra como QR.

### 2.4 Criterios de Validación Offline en el Dispositivo del Vendedor
Implementados en `verifyReceiptOffline` (`shared/src/qr.ts`), en este orden:
1. **Formato:** es un recibo v2 bien formado (`INVALID_FORMAT`).
2. **Llave fijada:** `keyId` coincide con la llave fijada (`KEY_MISMATCH`: *"Este comercio tiene una llave desactualizada. Conéctate a internet una vez para actualizarla."*).
3. **Integridad y autenticidad:** se regenera el digesto SHA-256 desde el contenido canónico y se verifica la firma ECDSA con la llave fijada (`INVALID_SIGNATURE`).
4. **Venta propia:** el `saleId` fue creado en este dispositivo (`UNKNOWN_SALE`).
5. **Anti-replay:** el recibo no fue redimido antes en IndexedDB (`ALREADY_REDEEMED`).
6. **Comercio:** `merchantWallet` es la billetera del dispositivo (`MERCHANT_MISMATCH`).
7. **Divisa:** mismo `assetCode` que la venta (`ASSET_MISMATCH`).
8. **Importe:** `amountReceived >= sale.amount`, con comparación exacta en BigInt e independiente de la escala (`AMOUNT_INSUFFICIENT`).

Un recibo válido con `mode: "simulator"` devuelve `kind: 'SIMULATED_PAYMENT'` y la PWA debe mostrarlo como simulación. Detalle y ejemplo de integración en `docs/API.md`.

---

## 3. Integración con Open Payments e Interledger

### 3.1 Flujo de Fondos y Multidivisa
1. **Wallet Address Discovery:** Resolución de endpoints del recurso y del servidor de autorización GNAP vía WebFinger (`/.well-known/open-payments`).
2. **Incoming Payment:** Creación del recurso de cobro en la billetera del comercio por un importe fijo a recibir.
3. **Quote (Cotización):** Solicitud de cotización de tipo `fixed-receive`. El comprador sabe de antemano el monto exacto debitado en su divisa local (ej. EUR o MXN) para que el vendedor reciba exactamente el monto solicitado en su divisa.
4. **Interactive Grant (GNAP):** El pagador autoriza la transacción en su billetera interactiva.
5. **Outgoing Payment:** Ejecución de la transferencia a través de paquetes ILP.
6. **Verificación Estricta:** Antes de firmar cualquier comprobante, RELEVO inspecciona el recurso `incomingPayment` para constatar que `receivedAmount.value >= requestedAmount`.

---

## 4. Estrategia de Persistencia y Sincronización

- **Dispositivo Móvil:** Almacenamiento local mediante `IndexedDB` de ventas pendientes, comprobantes validados offline y la clave pública maestra del sistema.
- **Servidor:** Base de datos SQLite (`node:sqlite`) con transacciones ACID para trazabilidad de ventas, pagos y auditoría de comprobantes emitidos.
- **Sincronización Posterior:** Al restablecerse la conectividad en el dispositivo del comercio, se despacha un lote de sincronización idempotente hacia el backend (`POST /api/sync`).
