<p align="center">
  <img src="brand/logo.svg" alt="RELEVO Logo" width="460" />
</p>

<p align="center">
  <strong>Cobra en cualquier moneda. Verifica sin internet.</strong><br />
  <em>PWA de cobro multidivisa basada en Open Payments con verificación criptográfica offline.</em>
</p>

<br />

| Concepto | Especificación |
| :--- | :--- |
| **Definición** | Aplicación web progresiva (PWA) móvil que permite a cualquier comercio cobrar en su moneda local y comprobar la recepción de fondos sin conexión de datos. |
| **Protocolo financiero** | Open Payments sobre la red Interledger (ILP). Liquidación directa de billetera a billetera; sin custodia de fondos ni emisión de deuda. |
| **Seguridad criptográfica** | Recibos verificables firmados digitalmente con ECDSA (curva P-256 / secp256r1) y resumen canónico SHA-256 mediante Web Crypto nativo. |
| **Modelo de verificación** | Validación local inmediata en el dispositivo del comercio mediante escaneo de código QR y comprobación de la clave pública fijada (`keyId`). |
| **Arquitectura de código** | Monorepo TypeScript: `@relevo/shared` (contratos y motor criptográfico), `@relevo/backend` (Fastify + SQLite) y `@relevo/frontend` (React + Tailwind). |
| **Resiliencia operativa** | Service Worker para ejecución offline, persistencia local con IndexedDB y túnel seguro HTTPS para dispositivos móviles. |

---

## Estado y seguimiento

El proyecto cuenta con una base monorepo funcional en `frontend/`, `backend/` y `shared/`. El objetivo del MVP es conectar billeteras de prueba mediante Open Payments y asegurar la validación criptográfica en modo offline.

- [Progreso ODD y próximos hitos](odd/tasks/mvp.md)
- [Estructura y ciclo de trabajo ODD](odd/README.md)
- [Registro de prompts reales de trabajo](prompts/README.md)
- [Declaración de uso de inteligencia artificial](AI_USAGE.md)

**Regla de verificación:** El comprador y el servidor necesitan conectividad para completar la transferencia en la red Interledger; el comercio verifica la firma del comprobante directamente en su pantalla sin consumir datos móviles.

- **Tipo:** PWA Fintech · Open Payments / Interledger
- **Etapa:** MVP para Hackatón
- **Usuarios objetivo:** Comerciantes independientes, ferias, transporte, turismo y zonas con conectividad intermitente.

---

## Visión

RELEVO permite que un comercio reciba pagos desde billeteras digitales de cualquier parte del mundo y verifique con certeza matemática que los fondos fueron transferidos, aun cuando su propio teléfono no tenga acceso a internet.

La solución no intermedia fondos, no requiere stablecoins propietarias y no cobra comisiones ocultas sobre el tipo de cambio.

---

## El problema

Los pequeños comerciantes enfrentan pérdidas significativas cuando la conectividad falla:
- Depender de capturas de pantalla ("pantallazos") o mensajes SMS genera vulnerabilidad frente a comprobantes falsificados y aplicaciones clonadas.
- La confirmación bancaria tradicional exige que ambas partes dispongan de red móvil activa y plan de datos disponible en el momento exacto de la transacción.
- Los compradores internacionales o no bancarizados se ven limitados por conversiones de divisas opacas o tarifas bancarias elevadas.

---

## Propuesta de valor

- **Comerciantes:** Aceptan cobros digitales y confirman la validez de la transferencia escaneando un código QR firmado por el backend, sin necesidad de conexión a internet.
- **Compradores:** Pagan desde su billetera Open Payments habitual conociendo la tasa de cambio, el importe debitado en su divisa y el monto exacto acreditado al vendedor.
- **Comunidad y ecosistema:** Fomenta la inclusión financiera en economías emergentes y eventos al aire libre mediante estándares abiertos interoperables.

---

## Arquitectura del sistema

El repositorio utiliza una arquitectura de monorepo estructurada en tres paquetes independientes:

```
relevo/
├── brand/          # Identidad corporativa, símbolos y logotipos vectoriales SVG
├── shared/         # Tipos compartidos, esquemas QR y motor Web Crypto de verificación
│   ├── src/types.ts    # Modelos de venta, cotizaciones, recibos y estados
│   ├── src/crypto.ts   # Criptografía ECDSA P-256 + SHA-256 canónico
│   └── src/qr.ts       # Serialización y verificación offline de comprobantes
├── backend/        # Servidor Fastify + SQLite con integración Open Payments
│   ├── src/services/openPayments.ts   # Cliente Open Payments / GNAP de Interledger
│   ├── src/services/cryptoService.ts  # Emisión y firma digital de recibos
│   └── src/services/db.ts             # Persistencia de ventas y cotizaciones
└── frontend/       # PWA mobile-first con React, Vite y diseño responsivo
    ├── src/App.tsx     # Enrutamiento de flujos: Cobrar (Vendedor) y Pagar (Comprador)
    ├── src/views/      # Vistas de Cobro, Pago, Verificación, Historial y Onboarding
    └── src/storage.ts  # Persistencia offline en IndexedDB
```

---

## Estados del pago

| Estado | Código interno | Descripción técnica |
| :--- | :--- | :--- |
| **Esperando pago** | `WAITING_PAYMENT` | Solicitud creada por el comercio; fondos no recibidos. |
| **Autorización pendiente** | `AUTHORIZATION_PENDING` | El comprador debe consentir la transacción mediante GNAP en su billetera. |
| **Procesando** | `PROCESSING` | Transferencia despachada a la red Interledger, en espera de liquidación. |
| **Pago verificado** | `PAYMENT_VERIFIED` | Fondos confirmados por el backend en la cuenta del comercio. |
| **Verificado offline** | `OFFLINE_VERIFIED` | Firma criptográfica del recibo validada matemáticamente en el dispositivo del comercio sin internet. |
| **Fallido o vencido** | `FAILED_OR_EXPIRED` | Transacción rechazada por el usuario, sin fondos suficientes o expirada. |

> **Principio de seguridad financiera:** Ninguna venta se considera completada únicamente por la existencia de una autorización o una captura de pantalla. La acreditación requiere confirmación de fondos recibidos en el backend y verificación de firma digital en el comprobante.

---

## Stack tecnológico

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, PWA (Service Worker + IndexedDB).
- **Backend:** Node.js 24, Fastify, `@interledger/open-payments`.
- **Criptografía:** Web Crypto API nativa, ECDSA (curva P-256 / secp256r1), SHA-256 canónico.
- **Base de datos:** SQLite en backend e IndexedDB en cliente.
- **Red financiera:** Interledger Test Wallet (Rafiki).

---

## Primeros pasos (desarrollo local)

### Prerrequisitos
- Node.js >= 20 (recomendado Node 24)
- npm >= 10

### Instalación
```bash
npm install
npm run build --workspace=shared          # Compila tipos y motor criptográfico
cp backend/.env.example backend/.env      # Configura variables de entorno
```

### Configuración del modo: `OP_MODE`
El backend requiere definir `OP_MODE` en `backend/.env` para iniciar:

| `OP_MODE` | Comportamiento | Distintivo en la PWA |
| :--- | :--- | :--- |
| `live` | Open Payments real contra la Interledger Test Wallet. Errores de red se reportan directamente sin desvíos simulados. | `LIVE · Interledger Test Wallet` |
| `simulator` | Flujo en memoria para demostración sin conectividad externa. Los recibos se firman con distintivo explícito de simulación. | `SIMULATOR` |

### Llave de firma de comprobantes
Los comprobantes se firman con una clave ECDSA P-256 persistida en `backend/.relevo-backend-keys.json` (excluida del control de versiones). Su identificador `keyId` (huella RFC 7638) se fija en la aplicación del comercio:

```bash
npm run keys:generate --workspace=backend   # Generación única; protege claves existentes
```

En modo `live`, el backend no inicia si la clave no existe para evitar rotaciones accidentales.

### Credenciales de Open Payments (modo live)
1. Registrar cuentas en https://wallet.interledger-test.dev para comercio y comprador con saldo de prueba.
2. Ingresar a Settings -> Developer Keys, generar clave, copiar el **Key ID** y almacenar `private.key` en `backend/` (ignorado en git).
3. Completar las variables en `backend/.env`: `OPEN_PAYMENTS_CLIENT_WALLET`, `OPEN_PAYMENTS_KEY_ID`, `OPEN_PAYMENTS_PRIVATE_KEY_PATH`, `MERCHANT_WALLET`, `SMOKE_MERCHANT_WALLET` y `SMOKE_BUYER_WALLET`.

### Ejecución de servicios
```bash
npm run dev:backend    # Puerto 3000 (API y servicios Open Payments)
npm run dev:frontend   # Puerto 5173 (PWA Vite con proxy a /api)
```

### Pruebas automatizadas
```bash
npm test               # Ejecuta las suites de shared, backend y frontend (38 tests)
npm run typecheck      # Validación estricta de tipos TypeScript
```

### Prueba de flujo completo en consola
Permite verificar el ciclo completo sin interfaz gráfica:
```bash
npm run smoke:live --workspace=backend
```
Genera la URL de autorización interactiva para aprobar desde el navegador y valida la firma del comprobante resultante.

---

## Pruebas en dispositivos móviles por HTTPS

El acceso a la cámara mediante `getUserMedia` (para el escaneo de códigos QR) y el funcionamiento del Service Worker requieren una conexión segura HTTPS. Es posible utilizar un túnel Cloudflare hacia el puerto local de Vite:

```
Dispositivo móvil ──HTTPS──> Cloudflare Tunnel ──> Vite :5173 ──/api──> Backend :3000
```

1. Iniciar los servicios locales (`npm run dev:backend` y `npm run dev:frontend`).
2. Abrir el túnel con cloudflared:
   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```
3. Configurar en `backend/.env` la URL asignada:
   ```env
   PUBLIC_FRONTEND_URL=https://<subdominio>.trycloudflare.com
   ```
4. Reiniciar el backend para actualizar las políticas de redirección y orígenes permitidos por CORS.
5. Acceder a la URL segura desde el navegador móvil para instalar la PWA y habilitar la cámara.
