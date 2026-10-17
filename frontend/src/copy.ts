// Stable keys keep Spanish-first interface with full English catalog.
export const es = {
  brand: 'Relevo',
  tagline: 'Cobra sin complicaciones. Verifica sin internet.',

  navigation: {
    inicio: 'Inicio',
    movimientos: 'Movimientos',
    escanear: 'Escanear',
    cuenta: 'Tu cuenta'
  },

  actions: {
    collect: 'Cobrar',
    pay: 'Pagar',
    scan: 'Escanear',
    start: 'Empezar',
    connect: 'Conectar billetera',
    setup: 'Configurar',
    back: 'Atrás',
    close: 'Cerrar',
    learn: 'Conoce Relevo',
    next: 'Continuar',
    continue: 'Continuar',
    create: 'Crear QR',
    all: 'Ver todos',
    retry: 'Volver a intentar',
    transfer: 'Transferir',
    cancel: 'Cancelar',
    save: 'Guardar',
    edit: 'Editar',
    register: 'Registrarse',
  },

  limits: {
    min: 1,
    max: 15000000,
    currency: 'COP',
    minError: 'El monto mínimo es $1',
    maxError: 'El máximo permitido es $15.000.000',
  },

  home: {
    eyebrow: 'TU DÍA, SIN COMPLICACIONES',
    greeting: 'Hola',
    subtitle: 'Tus cobros, sin complicaciones.',
    today: 'Cobros verificados hoy',
    emptyTitle: 'Todo empieza con un primer cobro.',
    emptyBody: 'Aún no hay cobros verificados',
    noBalance: 'Este no es el saldo de tu banco. Solo lo que has cobrado y verificado.',
    quick: '¿Qué quieres hacer?',
    recent: 'Últimos movimientos',
    activityTitle: 'Tu historia empieza aquí',
    activityBody: 'Cuando tengas movimientos, los encontrarás aquí.',
  },

  connection: {
    online: 'Dispositivo con conexión',
    offline: 'Dispositivo sin conexión',
    offlineBody: 'Aún no está preparado para cobrar sin datos.',
    notReady: 'Configuración pendiente'
  },

  onboarding: {
    eyebrow: 'COBROS SIN COMPLICACIONES',
    title: 'Cobra en cualquier moneda.\nComprueba sin internet.',
    subtitle: 'Un QR para cobrar. Otro para saber que sí llegó.',
    existing: 'Ya tengo cuenta',
    note: 'Configuración inicial con internet.',
    tagline: 'Recibe pagos internacionales al instante, sin complicaciones.',
    register: 'Regístrate',
    setupHint: 'Cuéntanos tu nombre y qué moneda cobras.',
    name: 'Nombre de tu negocio',
    namePlaceholder: 'Ej: Doña Arepas',
    currency: 'Moneda',
    currencyCOP: 'Pesos (Colombia)',
    currencyUSD: 'Dólares',
    currencyEUR: 'Euros',
    currencyBRL: 'Reales (Brasil)',
    currencyMXN: 'Pesos (México)',
    language: 'Idioma',
    privacyHint: 'Tus datos se guardan solo en tu teléfono. Nada se envía a internet.',
    security: 'Tus fondos permanecen en tu billetera.',
  },

  collect: {
    title: 'Nuevo cobro',
    subtitle: 'Primero el monto. Después, tu QR.',
    amount: 'Importe del cobro',
    currency: 'Moneda',
    description: '¿Qué vendiste?',
    placeholder: 'Por ejemplo: arepa con queso',
    delete: 'Borrar',
    decimal: '.',
    min: 'Mínimo $1',
    max: 'Máximo $15.000.000',
    prerequisite: 'Este no es el saldo de tu banco. Solo lo que has cobrado y verificado.',
  },

  profile: {
    title: 'Tu cuenta',
    name: 'Nombre del negocio',
    currency: 'Moneda',
    language: 'Idioma',
    spanish: 'Español',
    english: 'English',
  },

  activity: {
    title: 'Tu historial',
    subtitle: 'Cobros verificados',
    empty: 'Aún no hay movimientos',
    body: 'Cuando tengas cobros verificados, aparecerán aquí.',
  },
} as const

export const en = {
  brand: 'Relevo',
  tagline: 'Collect without complications. Verify offline.',

  navigation: {
    inicio: 'Home',
    movimientos: 'Activity',
    escanear: 'Scan',
    cuenta: 'Account'
  },

  actions: {
    collect: 'Collect',
    pay: 'Pay',
    scan: 'Scan',
    start: 'Start',
    connect: 'Connect wallet',
    setup: 'Set up',
    back: 'Back',
    close: 'Close',
    learn: 'Learn more',
    next: 'Next',
    continue: 'Continue',
    create: 'Create QR',
    all: 'Show all',
    retry: 'Try again',
    transfer: 'Transfer',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    register: 'Register',
  },

  limits: {
    min: 1,
    max: 15000000,
    currency: 'COP',
    minError: 'Minimum amount is $1',
    maxError: 'Maximum allowed is $15,000,000',
  },

  home: {
    eyebrow: 'YOUR DAY, SIMPLIFIED',
    greeting: 'Hello',
    subtitle: 'Your collections, no complications.',
    today: 'Verified collections today',
    emptyTitle: 'Every journey starts with the first collection.',
    emptyBody: 'No verified collections yet',
    noBalance: 'This is not your bank balance. Only what you have collected and verified.',
    quick: 'What do you want to do?',
    recent: 'Recent activity',
    activityTitle: 'Your history begins here',
    activityBody: 'Your collections and payments will appear here.',
  },

  connection: {
    online: 'Device online',
    offline: 'Device offline',
    offlineBody: 'Not yet ready to collect offline.',
    notReady: 'Setup pending'
  },

  onboarding: {
    eyebrow: 'COLLECTIONS WITHOUT COMPLICATIONS',
    title: 'Collect in any currency.\nVerify offline.',
    subtitle: 'One QR to collect. Another to confirm it arrived.',
    existing: 'I already have an account',
    note: 'Initial setup requires internet.',
    tagline: 'Receive international payments instantly, without complications.',
    register: 'Register',
    setupHint: 'Tell us your business name and which currency you collect.',
    name: 'Your business name',
    namePlaceholder: 'Example: Doña Arepas',
    currency: 'Currency',
    currencyCOP: 'Pesos (Colombia)',
    currencyUSD: 'Dollars',
    currencyEUR: 'Euros',
    currencyBRL: 'Reales (Brazil)',
    currencyMXN: 'Pesos (Mexico)',
    language: 'Language',
    privacyHint: 'Your data is saved only on your phone. Nothing is sent to the internet.',
    security: 'Your funds stay in your wallet.',
  },

  collect: {
    title: 'New collection',
    subtitle: 'Amount first. QR after.',
    amount: 'Collection amount',
    currency: 'Currency',
    description: 'What did you sell?',
    placeholder: 'Example: arepa with cheese',
    delete: 'Delete',
    decimal: '.',
    min: 'Minimum $1',
    max: 'Maximum $15,000,000',
    prerequisite: 'This is not your bank balance. Only what you have collected and verified.',
  },

  profile: {
    title: 'Your account',
    name: 'Business name',
    currency: 'Currency',
    language: 'Language',
    spanish: 'Español',
    english: 'English',
  },

  activity: {
    title: 'Your history',
    subtitle: 'Verified collections',
    empty: 'No activity yet',
    body: 'When you have verified collections, they will appear here.',
  },
} as const

export type Language = 'es' | 'en'
export const t = (lang: Language) => (lang === 'en' ? en : es)
