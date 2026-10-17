// Stable keys keep the Spanish-first interface ready for a reviewed English catalog.
export const es = {
  brand: 'Relevo',
  tagline: 'El dinero se mueve. Tú sigues.',
  navigation: { inicio: 'Inicio', movimientos: 'Movimientos', escanear: 'Escanear', cuenta: 'Cuenta' },
  actions: { collect: 'Cobrar', pay: 'Pagar', scan: 'Escanear', start: 'Empezar', connect: 'Conectar billetera', setup: 'Configurar mi billetera', back: 'Volver al inicio', close: 'Cerrar', learn: 'Conoce Relevo', next: 'Continuar', create: 'Crear QR', all: 'Ver todos', retry: 'Volver a intentar' },
     home: {
    eyebrow: 'TU DÍA, SIN COMPLICACIONES', greeting: 'Hola', subtitle: 'Tus cobros, sin complicaciones.',
    today: 'Cobros verificados hoy', emptyTitle: 'Todo empieza con\nun primer cobro.',
    emptyBody: 'Aún no hay cobros verificados', noBalance: 'Aquí verás tus cobros conciliados, no el saldo de tu banco.',
    quick: '¿Qué quieres hacer?', collect: 'Crea un cobro', pay: 'Paga con tu wallet', scan: 'Lee un código QR',
    recent: 'Últimos movimientos', activityTitle: 'Tu historia empieza aquí', activityBody: 'Cuando tengas movimientos, los encontrarás aquí. Sin balances inventados, solo lo que pasó.',
     asideTitle: 'La señal va y viene.\nTu negocio sigue.', asideBody: 'Un QR para cobrar. Otro para comprobar el pago, incluso sin datos.', asideNote: 'La preparación inicial necesita internet.',
    stepsTitle: 'Así de sencillo', steps: ['Crea y comparte tu cobro.', 'Tu cliente paga con internet.', 'Verifica el recibo firmado.'],
    trust: 'Tu dinero, en tu billetera.', trustBody: 'Relevo no es un banco y no custodia tu dinero.',
  },
  connection: { online: 'Dispositivo con conexión', offline: 'Dispositivo sin conexión', offlineBody: 'Este dispositivo aún no está preparado para cobrar sin datos.', notReady: 'Configuración pendiente' },
  setup: {
     title: 'Conecta tu billetera', subtitle: 'Tu dinero sigue en tu billetera. Relevo te ayuda a cobrar y pagar.',
     label: 'Dirección de tu billetera', placeholder: 'Pega aquí la dirección de tu billetera', hint: 'Usa la dirección que te da tu proveedor, no tu correo ni tu contraseña.',
    notice: 'Haz esta configuración con internet. Después podrás generar cobros sin datos.',
     unavailableTitle: 'La conexión aún no está disponible', unavailableBody: 'Estamos preparando esta función. Por ahora no vinculamos billeteras ni realizamos pagos.',
    invalid: 'Introduce una dirección HTTPS válida, sin contraseñas ni tokens.', failed: 'No pudimos conectar tu billetera: la integración real todavía no está habilitada. No guardamos tu dirección.',
    privacy: 'Nunca te pediremos la contraseña de tu billetera.', checklistTitle: 'Para cobrar sin conexión',
    checklist: ['Vincular una wallet compatible', 'Preparar la aplicación en este dispositivo', 'Descargar las claves de verificación'], pending: 'Pendiente',
  },
  onboarding: {
    eyebrow: 'MENOS FRONTERAS. MÁS POSIBILIDADES.', title: 'Cobra en cualquier moneda.\nComprueba sin internet.',
    subtitle: 'Un QR para cobrar. Otro para saber que sí llegó.', existing: 'Ya tengo cuenta', note: 'Con billeteras y monedas compatibles. Configuración inicial con internet.',
  },
  collect: {
    title: 'Nuevo cobro', subtitle: 'Primero el monto. Después, tu QR.', amount: 'Importe del cobro', currency: 'Moneda por vincular', description: '¿Qué vendiste?', placeholder: 'Por ejemplo, una arepa con queso',
    prerequisite: 'Vincula una billetera para conocer su moneda y precisión. Este importe es un borrador; todavía no es una solicitud de pago.',
    disabled: 'Para crear un QR necesitas una wallet vinculada y una firma local. No podemos generarlo todavía.', delete: 'Borrar último dígito', decimal: 'Separador decimal',
  },
  activity: { title: 'Movimientos', subtitle: 'Cada paso de tu dinero, con claridad.', tabs: ['Todos', 'Pendientes', 'Verificados'], empty: 'Todavía no hay movimientos', body: 'Los cobros y pagos aparecerán aquí cuando la integración esté disponible.', offline: 'Sin conexión. Aún no hay registros guardados en este dispositivo.' },
  account: {
    title: 'Tu cuenta', subtitle: 'Tu billetera. Tus reglas.', wallet: 'Billetera vinculada', noWallet: 'Aún no has conectado una billetera', currency: 'Moneda de recepción', unknown: 'Sin determinar', readiness: 'Uso sin conexión', notReady: 'Dispositivo sin preparar', language: 'Idioma', spanish: 'Español',
    help: '¿Qué puedo hacer sin internet?', helpBody: 'Una vez preparada la aplicación, podrás crear cobros y comprobar recibos firmados. En esta versión esa preparación aún no está disponible. El comprador siempre necesita conexión para pagar.',
  },
   pay: { title: 'Pagar', subtitle: 'Escanea, revisa y confirma.', heading: 'Primero, escanea el cobro', body: 'Verás cuánto recibe el comercio y cuánto pagarás antes de confirmar.', receive: 'El comercio recibe', debit: 'Tú pagas', unknown: 'Conversión no disponible', note: 'La conversión aparecerá cuando la billetera la confirme.' },
  scanner: { title: 'Escanear QR', subtitle: 'Un código, el siguiente paso.', heading: 'Preparemos tu dispositivo', body: 'El lector de cobros y la verificación de recibos estarán disponibles después de conectar tu wallet y preparar las claves. Todavía no podemos validar un pago.', privacy: 'La cámara solo se solicitará al abrir un lector disponible.', action: 'Ir a configuración' },
} as const
