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
| **Esperando pago** (`WAITING_PAYMENT`) | Solicitud creada por el comercio, dinero todavía no recibido. |
| **Autorización pendiente** (`AUTHORIZATION_PENDING`) | El comprador aún debe consentir el pago mediante GNAP. |
| **Procesando** (`PROCESSING`) | Transferencia iniciada en la red Interledger, pendiente de confirmación. |
| **Pago verificado** (`PAYMENT_VERIFIED`) | Recepción comprobada por el backend en el proveedor Open Payments. |
| **Verificado offline** (`OFFLINE_VERIFIED`) | Comprobante firmado validado localmente en el dispositivo del vendedor sin internet. |
| **Fallido o vencido** (`FAILED_OR_EXPIRED`) | Pago no completado o expirado. |

> **Regla de Oro de Seguridad:** Nunca debe marcarse una venta como pagada únicamente porque existe una autorización, una captura de pantalla o un recurso marcado como completado sin comprobar su importe realmente recibido.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React, TypeScript, Vite, Tailwind CSS v4, PWA (IndexedDB + Web Crypto).
- **Backend:** Node.js 24, Fastify, `@interledger/open-payments`.
- **Persistencia:** SQLite en backend e IndexedDB en el dispositivo cliente.
- **Criptografía:** Web Crypto API nativa, ECDSA (curva P-256 / secp256r1) y SHA-256 canónico.
- **Infraestructura financiera:** Interledger Test Wallet (Rafiki).

---

## 🚀 Primeros Pasos (Desarrollo Local)

### Prerrequisitos
- Node.js >= 20 (recomendado Node 24)
- npm >= 10

### Instalación
```bash
# Instalar todas las dependencias del monorepo
npm install

# Compilar paquete compartido (tipos y criptografía)
npm run build --workspace=shared
```

### Ejecutar en Desarrollo
```bash
# Iniciar backend (puerto 3000)
npm run dev:backend

# Iniciar frontend (puerto 5173)
npm run dev:frontend
```
