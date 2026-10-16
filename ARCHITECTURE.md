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
│       ├── qr.ts             # Codificación/decodificación y validador offline
│       └── index.ts          # Punto de entrada exportado
├── backend/                  # @relevo/backend: Orquestador Open Payments y emisor de recibos
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config.ts         # Parámetros de entorno y defaults
│       ├── app.ts            # Rutas REST Fastify (buildServer) — contrato en docs/API.md
│       ├── server.ts         # Arranque del servidor
│       └── services/
│           ├── amounts.ts       # Conversión decimal <-> unidades mínimas (BigInt)
│           ├── cryptoService.ts # Gestión de clave maestra y firmado ECDSA
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
- **Generación de Claves:** Claves conformes con el estándar FIPS 186-4 utilizando la curva elíptica `P-256` (secp256r1).
- **Firma:** `ECDSA` con función hash `SHA-256`.
- **Compatibilidad:** Utiliza la API nativa del estándar W3C Web Cryptography API (`crypto.subtle`), disponible idénticamente en navegadores modernos y en Node.js 18+.

### 2.3 Estructura del Comprobante Verificable (`VerifiedReceipt`)
```typescript
interface VerifiedReceipt {
  version: '1';
  receiptId: string;          // UUID único del comprobante
  saleId: string;             // Enlace criptográfico estricto con la venta
  merchantWalletAddress: string;
  payerWalletAddress: string;
  amountReceived: string;     // Monto verificado efectivamente acreditado
  currency: string;           // Código de divisa ISO
  assetScale: number;         // Escala decimal
  incomingPaymentId: string;  // Recurso Open Payments
  outgoingPaymentId?: string;
  timestamp: number;          // Timestamp Unix
  payloadDigest: string;      // Hash SHA-256 del contenido canónico
  backendSignature: string;   // Firma ECDSA P-256 en formato Base64URL
}
```

### 2.4 Criterios de Validación Offline en el Dispositivo del Vendedor
Cuando el vendedor escanea el QR del comprobante presentado por el comprador:
1. **Verificación contra Doble Gasto:** Se comprueba que el `receiptId` no haya sido registrado previamente en la memoria local (IndexedDB / Set).
2. **Coincidencia de Venta (`saleId`):** El comprobante debe corresponder exactamente a la venta que el comerciante tiene activa y pendiente.
3. **Coincidencia de Comercio (`merchantWalletAddress`):** La billetera receptora debe ser la del comerciante local.
4. **Coincidencia de Divisa e Importe:** La divisa debe coincidir y `amountReceived >= sale.amount`.
5. **Integridad de Contenido:** Se regenera el digesto SHA-256 a partir del contenido canónico y se contrasta con `payloadDigest`.
6. **Autenticidad de Emisión:** Se verifica la firma ECDSA contra la clave pública maestra del servidor (almacenada localmente durante el onboarding).

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
