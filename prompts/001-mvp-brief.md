# RELEVO

**Pay across currencies. Verify without internet.**

Tipo: PWA fintech con Open Payments / Interledger  
Estado: MVP para el hackathon de Medellín  
Para quien: vendedores de la calle, tiendas de barrio, turistas y gente que no siempre tiene internet.

## la idea

Queremos que una persona pueda cobrar aunque no tenga datos. Por ejemplo doña arepas esta vendiendo en la calle, llega un turista que tiene otra moneda y ella no tiene internet para mirar si le llego la plata.

Con relevo ella crea un QR desde el telefono sin conexion, el turista lo escanea y paga con su wallet de Open Payments, revisando antes cuanto le cuesta en su moneda. Despues le muestra otro QR con la confirmacion y doña arepas lo escanea. Su telefono puede comprobar si el recibo lo firmo nuestro servidor, sin conectarse.

**Ojo:** esto no es transferir plata sin internet. El comprador y nuestro servidor tienen que estar online para hacer el pago. Lo offline es la creación del cobro y la verificacion local del recibo. Tampoco recibimos ni guardamos dinero de la gente.

## el problema

En muchos lados la señal es mala o no hay suficientes datos. Los vendedores terminan pidiendo efectivo o mirando pantallazos que cualquiera podria falsificar. Y si el comprador usa otra moneda tampoco queremos que tenga que ponerse a calcular cuanto enviar.

La idea es quitar esa friccion, usando pagos reales de prueba con Interledger en el hackathon.

## que va a hacer el mvp

### 1. registrarse (solo cuando hay internet)

- Vincular la wallet address de Open Payments del comercio.
- Dar los permisos necesarios para que el backend pueda crear y consultar incoming payments, segun permita la billetera.
- Descargar la PWA y las claves publicas para verificar firmas sin internet.
- Registrar la clave publica del vendedor, si vamos a firmar el QR desde su dispositivo.

### 2. cobrar offline

- El vendedor escribe el precio y escoge la moneda que su billetera realmente recibe.
- Se crea un ID unico de venta y un QR con monto, moneda, destinatario, fecha y firma.
- El cobro queda **pendiente**, no como pagado.
- El QR puede generarse estando en modo avion despues del setup inicial.

### 3. pagar desde otra moneda

- El comprador escanea el QR y se conecta a Relevo.
- Nuestro backend verifica que el cobro sea valido y crea el incoming payment del vendedor.
- La billetera del comprador genera una quote, para saber cuanto va a debitar en su moneda y cuanto recibira el vendedor.
- El comprador acepta con GNAP y se ejecuta el outgoing payment.
- Solo usamos monedas y conversiones soportadas realmente por las test wallets; no vamos a fingir COP si no existe.

### 4. demostrarle al vendedor que si le llego

- Relevo consulta el incoming payment y comprueba destinatario, moneda, monto recibido y venta asociada.
- Si todo esta correcto, el backend firma un recibo con su clave privada.
- El comprador muestra ese recibo como QR en su pantalla.
- El vendedor lo escanea y valida la firma con la clave publica que ya tenia guardada.
- Si le presentan un recibo viejo, cambiado o de otra venta, no se acepta.
- Al volver internet, el vendedor sincroniza y revisa la operación con el servidor.

La firma demuestra que Relevo verificó el pago en ese momento, **no** que la blockchain o el banco garantizan que jamas pueda existir otro problema despues.

### 5. historial

- Guardamos las ventas locales en IndexedDB.
- Mostramos pendientes, en proceso, verificadas offline y confirmadas al sincronizar.
- Al recuperar señal se hace reconciliación, sin duplicar ventas ni recibos.

## estados que vamos a mostrar

- **Esperando pago:** solo existe el cobro.
- **Por autorizar:** al comprador le falta aprobar el pago.
- **Procesando:** se intento pagar pero no hay confirmación completa.
- **Pagado / verificado:** el backend comprobó el dinero recibido.
- **Verificado offline:** el vendedor validó localmente el recibo firmado (luego se reconcilia).
- **Fallido / vencido:** no se completo el cobro.

Nunca decir pagado por un pantallazo, un grant, una quote o por ver `completed` sin comprobar el monto y el destinatario.

## tecnologias

- **Web:** React + TypeScript + Vite + Tailwind (PWA).
- **API:** Node.js + Fastify + `@interledger/open-payments`.
- **Datos:** SQLite en el backend y IndexedDB offline.
- **Firmas:** Web Crypto, ECDSA P-256 y SHA-256.
- **Pagos:** billeteras de prueba de Interledger, no plata real.

Primero que funcione un pago de punta a punta. Despues metemos el QR offline, no alreves.

## como se debe ver

Algo bien simple y bonito, blanco con verde bosque y lima. Letras grandes, botones que digan **Cobrar** y **Pagar**, historial sencillo, sin llenarlo de funciones que no vamos a usar. No queremos que doña arepas tenga que saber que es un grant para cobrar.

## seguridad

- Nunca meter secretos, tokens, ni claves privadas en el QR.
- QR de cobro y recibo con firmas verificables.
- ID aleatorio unico por venta, expiración y control de duplicados.
- No confiar en lo que diga el frontend del comprador; verificar siempre en nuestro backend con Open Payments.
- Guardar las claves privadas del servicio en variables seguras del servidor.
- Si no se puede validar, la app muestra **no confirmado**.

## que NO vamos a hacer ahora

- Dinero real totalmente offline con los dos sin señal.
- Bluetooth ni NFC (depronto despues, por ahora QR).
- Creditos, fiados, stablecoins, Bre-B o custodia de fondos.
- Integración real bancaria en Colombia.
- Prometer COP u otra conversión sin comprobarla en test wallet.

## que tenemos que alcanzar a demostrar

1. Que podemos pagar realmente desde una test wallet a otra con Open Payments.
2. Que la quote multidivisa funciona, **si hay dos activos compatibles**.
3. Que el vendedor puede crear un QR en modo avion.
4. Que el comprador paga con internet y le devuelve un QR firmado.
5. Que el vendedor verifica sin internet, y que un QR adulterado o repetido falla.
6. Que cuando vuelve internet todo se sincroniza sin duplicados.

## demo

Doña arepas se queda sin datos, genera un QR de una venta. El turista lo escanea y paga desde su billetera. Relevo verifica que si llegó el importe correcto y genera un comprobante firmado. Doña arepas lo escanea offline, le aparece **pago verificado**, y cuando vuelve la señal ve la venta en su historial.

**La meta es demostrar pagos entre monedas sin que el vendedor tenga que tener internet para comprobarlos.**

## entregables del hackathon

- Repositorio publico con el codigo y README claro.
- Demo real con solicitud, autorización, ejecución y pago confirmado.
- Presentación y video/enlace de demo según el formulario del evento.
- `AI_USAGE.md` y los prompts verdaderos que le enviemos a las IAs en `/prompts/`.
- Opcional: `skills/REGISTRO.md` para anotar skills de agentes si las llegamos a usar; Interledger no lo pide como archivo obligatorio.

El cierre oficial de codigo y entrega es el **17 de octubre a las 11:00 a. m.**. Revisar todo antes de subirlo.

## referencias

- https://openpayments.dev/
- https://openpayments.dev/es/guides/onetime-remittance-fixed-receive/
- https://interledger.org/hackathon/ai-policy/
- https://interledger.org/hackathon/submission-judging/
