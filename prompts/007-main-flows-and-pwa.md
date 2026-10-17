Estos son los flujos principales que debemos tener 2. *Flujo "Cobrar" (Comercio / Vendedor):*
   - Teclado numérico táctil interactivo (Numpad rápido para introducir montos).
   - Selector de moneda (USD, EUR, MXN, COP).
   - Botón "Generar Cobro": crea  PaymentSaleRequest  y muestra en pantalla completa el *QR de venta* nítido y de alto contraste ( qrcode.react ).
   - Botón "Escanear Comprobante": activa la cámara para leer el segundo QR del comprador.

3. *Flujo "Pagar" (Comprador con Internet):*
   - Lector QR con cámara ( html5-qrcode  o video stream) para capturar el QR de la venta.
   - Tarjeta de cotización multidivisa: muestra divisa del comprador vs. divisa del comercio, tasa de cambio y comisión.
   - Botón interactivo de autorización / consentimiento GNAP.
   - Vista de éxito: despliega el *QR del Comprobante Verificable* para que el comercio lo escanee.

4. *Pantalla de Verificación Exitosa (Comercio):*
   - Feedback háptico/visual inmediato con badge verde gigante: "Pago Verificado Offline".
   - Detalle del comprobante: ID de venta, divisa e importe recibido, sello criptográfico válido.
   - Opción para iniciar una nueva venta.

5. *PWA y Caché Offline:*
   - Configuración de  manifest.json  (iconos, standalone mode, tema).
   - Service worker para precachear HTML, CSS y bundle JS, asegurando que la app abra al 100% en modo avión. para la estetica sigue las https://vercel.com/design/guidelines la skill apple design y la sigueinte referencia estetica que se te era adjuntada
