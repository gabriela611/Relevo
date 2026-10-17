# 🚀 RELEVO — Guión Oficial de Pitch y Demo (3 Minutos)

> **Cobra en cualquier moneda. Verifica sin internet.**  
> Hackatón Open Payments / Interledger — Medellín

---

## 🎯 El Gancho (Primeros 30 Segundos)

> *"Doña Elena tiene un puesto de arepas en el centro de Medellín. Llega un turista extranjero con euros en su billetera digital Open Payments y quiere pagar. Pero Doña Elena no tiene plan de datos ni Wi-Fi.*  
> *¿La alternativa habitual? Pedir efectivo, perder la venta o confiar en un pantallazo de WhatsApp que cualquiera puede falsificar en 5 segundos.*  
>  
> *Con **RELEVO**, Doña Elena cobra en su moneda y comprueba con certeza matemática que el dinero fue transferido a su billetera, **con su teléfono completamente en modo avión**."*

---

## 📱 Preparación Previa a Subir al Escenario

| Elemento | Estado Requerido | Responsable |
| :--- | :--- | :--- |
| **Dispositivo 1 (Comercio / Doña Elena)** | Celular o pestaña izquierda: PWA abierta en `http://localhost:5173` (o túnel HTTPS). **Poner en Modo Avión** (o activar botón "Forzar Modo Avión" en la barra de demo). | Persona 1 |
| **Dispositivo 2 (Turista / Alex)** | Celular con datos o pestaña derecha: Conectado a internet. | Persona 2 |
| **Servidores Locales** | Backend (`npm run dev:backend` :3000) y Frontend (`npm run dev:frontend` :5173) en ejecución. | Persona 3 |
| **Plan B / Respaldo** | Barra flotante **"Demo Jueces ⚡"** visible en la esquina inferior derecha para inyección inmediata de casos en 1 clic si falla la red del evento. | Persona 3 |

---

## ⏱️ Cronómetro de la Demo en Vivo

### Minuto 0:30 – 1:15: Venta Creada Offline
1. **Acción:** Doña Elena abre RELEVO en su teléfono en **Modo Avión** (se observa el banner gris/verde: *"Cobrando sin datos"*).
2. **Acción:** En la pantalla principal presiona **Cobrar**, digita `$10.00 USD` en el teclado numérico de alta legibilidad y presiona **Generar Cobro**.
3. **Resultado en pantalla:** Se despliega en pantalla completa el **QR de venta** (`relevo:sale:v1:...`).
4. **Narrativa:**
   > *"La solicitud de cobro y el identificador criptográfico único se generan 100% en el dispositivo de Doña Elena sin enviar un solo byte a la red."*

### Minuto 1:15 – 2:00: Pago Multidivisa con Open Payments
1. **Acción:** El turista (con internet) abre su app o escanea el QR de Doña Elena.
2. **Acción:** La pantalla del comprador muestra la cotización en tiempo real:
   - Recibe comercio: `$10.00 USD`
   - Debita comprador: `€9.25 EUR` (tasa exacta fijada por Open Payments)
3. **Acción:** El turista presiona **Pagar** y autoriza la transacción mediante GNAP.
4. **Acción:** El backend de RELEVO consulta el recurso `IncomingPayment` en la billetera de Doña Elena, valida que los fondos efectivamente ingresaron y firma digitalmente un comprobante ECDSA P-256 (`relevo:receipt:v2:...`).
5. **Resultado en pantalla:** El comprador muestra en su teléfono el **QR de comprobante verificado**.
6. **Narrativa:**
   > *"Regla de oro de RELEVO: nuestro backend nunca emite un comprobante por un simple consentimiento o pantallazo; comprueba en el protocolo Interledger que el dinero realmente aterrizó en la cuenta del vendedor."*

### Minuto 2:00 – 2:30: Verificación Matemática Offline
1. **Acción:** Doña Elena toma su teléfono (**aún en Modo Avión sin internet**) y presiona **Escanear Comprobante**.
2. **Acción:** Apunta la cámara al QR del comprador.
3. **Resultado en pantalla:** En menos de 20 milisegundos, aparece una pantalla de éxito con **Badge Verde Gigante**:
   - `✓ Pago Verificado Offline`
   - Importe: `$10.00 USD`
   - Hash canónico y firma digital validada localmente.
4. **Narrativa:**
   > *"El teléfono de Doña Elena no consultó internet. Utilizó la Web Crypto API nativa y la clave pública del backend almacenada en IndexedDB para verificar la firma digital del comprobante. Certeza matemática absoluta."*

### Minuto 2:30 – 2:45: Demostración Anti-Fraude en Vivo
1. **Acción:** En la barra de demo, presionar **"Simular Fraude (Adulterado)"** o volver a escanear el mismo recibo.
2. **Resultado en pantalla:** La app emite una **Alerta Roja Inmediata**:
   - Si se alteró el importe en 1 centavo: `✕ Comprobante falso o alterado: la firma no es válida.`
   - Si se intenta reutilizar el mismo comprobante: `✕ Este comprobante ya fue usado (Anti-Replay Attack).`
3. **Narrativa:**
   > *"Un cliente deshonesto no puede presentar un pantallazo editado ni reutilizar el comprobante de ayer: si se cambia un solo centavo, la firma se rompe; si se vuelve a pasar, IndexedDB lo rechaza por doble uso."*

### Minuto 2:45 – 3:00: Cierre y Reconciliación
1. **Acción:** Doña Elena desactiva el Modo Avión; al volver la señal, la app despacha la cola de sincronización (`syncQueue`) hacia `POST /api/sync` de forma transparente y sin duplicar transacciones.
2. **Cierre:**
   > *"RELEVO elimina la barrera de conectividad para los millones de comerciantes informales de América Latina y el mundo. Pagos globales sobre Interledger, confianza local sin internet. Muchas gracias."*

---

## 💡 Preguntas Frecuentes del Jurado (Q&A)

### 1. ¿Cómo sabe el teléfono de Doña Elena que el recibo es legítimo si no tiene internet?
El teléfono tiene almacenada de forma persistente en **IndexedDB** la clave pública (`JWK`) del backend de RELEVO (fijada durante el onboarding). Cuando el comprador muestra el QR, el teléfono local ejecuta la verificación de firma digital **ECDSA sobre la curva P-256** directamente en el chip del dispositivo mediante la **Web Crypto API**. Es computacionalmente imposible falsificar la firma sin la clave privada del servidor.

### 2. ¿Qué impide que un comprador use el mismo QR de recibo dos veces?
Cada recibo contiene un identificador único criptográfico (`receiptId`) y está vinculado al `saleId` específico de esa venta. Cuando el teléfono del comercio valida un recibo, lo registra en su almacén local de recibos redimidos. Cualquier intento posterior de presentar el mismo recibo es rechazado inmediatamente como `ALREADY_REDEEMED`.

### 3. ¿RELEVO custodia fondos o emite tokens/criptomonedas?
**No.** RELEVO no es un banco ni un custodio. Todos los pagos ocurren directamente de billetera a billetera sobre la red abierta **Interledger (Open Payments)**. Doña Elena recibe fondos directamente en su proveedor financiero habitual.

### 4. ¿Qué pasa si el comprador tampoco tiene internet?
El protocolo Open Payments exige que el comprador y el servidor interactúen para liquidar la transferencia en la red financiera. El comprador utiliza sus datos móviles o el Wi-Fi de la zona; la innovación de RELEVO radica en que **el vendedor no necesita conectividad**, protegiendo al comerciante informal que frecuentemente no tiene saldo de datos.

---

## 🛠️ Botones de Emergencia (DemoToolbar)

Si durante la presentación en vivo la red del auditorio falla o no hay cámara disponible:
- **`Simular Pago Válido`**: Emite un recibo simulado válido y navega a la pantalla de verificación.
- **`Simular Fraude (Adulterado)`**: Dispara la alerta roja de firma inválida.
- **`Simular Replay Attack`**: Demuestra el bloqueo por recibo reutilizado.
- **`Forzar Modo Avión`**: Muestra el comportamiento sin desconectar la laptop del proyector.
- **`Reiniciar Datos Demo`**: Limpia el historial para la siguiente ronda de jueces.
