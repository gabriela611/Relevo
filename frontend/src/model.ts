export const routes = ['inicio', 'movimientos', 'escanear', 'cuenta', 'cobrar', 'pagar', 'configurar', 'bienvenida'] as const
export type Route = typeof routes[number]

export function resolveRoute(hash: string): Route {
  const candidate = hash.replace(/^#/, '')
  return routes.includes(candidate as Route) ? candidate as Route : 'inicio'
}

function validScale(scale: number) {
  return Number.isInteger(scale) && scale >= 0 && scale <= 20
}

// No floating-point conversion: wallet scale is mandatory, never inferred from ISO.
export function toMinorUnits(value: string, scale: number): string | null {
  if (!validScale(scale) || !/^\d+(\.\d+)?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  if (fraction.length > scale) return null
  return BigInt(whole + fraction.padEnd(scale, '0')).toString()
}

export function formatMinorUnits(value: string, scale: number, locale = 'es-CO'): string {
  if (!validScale(scale) || !/^\d+$/.test(value)) throw new RangeError('Invalid minor-unit amount or scale')
  const digits = value.padStart(scale + 1, '0')
  const whole = scale ? digits.slice(0, -scale) : digits
  const grouped = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(BigInt(whole))
  const separator = new Intl.NumberFormat(locale).formatToParts(1.1).find(part => part.type === 'decimal')?.value ?? '.'
  return scale ? `${grouped}${separator}${digits.slice(-scale)}` : grouped
}

/** Formats a human-entered amount without converting it to floating point. */
export function formatAmountInput(value: string, locale = 'es-CO'): string {
  if (!/^\d+(\.\d*)?$/.test(value)) return value
  const [whole, fraction] = value.split('.')
  const groupedWhole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(BigInt(whole || '0'))
  if (fraction === undefined) return groupedWhole
  const separator = new Intl.NumberFormat(locale).formatToParts(1.1).find(part => part.type === 'decimal')?.value ?? ','
  return `${groupedWhole}${separator}${fraction}`
}

/** Presentation only: the ISO code remains visible beside potentially shared symbols. */
export function currencySymbol(currency: string, locale = 'es-CO'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find(part => part.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

export interface ReceivedReceiptForToday {
  amountReceived: {
    value: string
    assetScale: number
    assetCode: string
  }
  issuedAt: number
  mode?: string
}

export function formatReceivedToday(
  receipts: ReceivedReceiptForToday[],
  currency: string,
  now = new Date(),
  locale = 'es-CO'
): string {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()

  const valid = receipts.filter((r) => {
    if (!r.amountReceived || r.amountReceived.assetCode !== currency) return false
    if (r.mode === 'simulator') return false
    return r.issuedAt >= startOfDay && r.issuedAt <= endOfDay
  })

  if (valid.length === 0) return '0'

  const maxScale = Math.max(...valid.map((r) => r.amountReceived.assetScale || 0))
  let totalMinor = 0n

  for (const r of valid) {
    const scale = r.amountReceived.assetScale || 0
    const factor = 10n ** BigInt(maxScale - scale)
    totalMinor += BigInt(r.amountReceived.value || '0') * factor
  }

  return formatMinorUnits(totalMinor.toString(), maxScale, locale)
}

export function editAmount(current: string, key: string): string {
  if (key === 'delete') return current.slice(0, -1) || '0'
  if (!/^[0-9.]$/.test(key) || current.length >= 15) return current
  if (key === '.') return current.includes('.') ? current : `${current}.`
  return current === '0' ? key : `${current}${key}`
}

const paymentStates = {
  LOCAL_DRAFT: { label: 'Cobro listo para compartir', verified: false, tone: 'neutral' },
  AWAITING_PAYMENT: { label: 'Esperando pago', verified: false, tone: 'warning' },
  AWAITING_CONSENT: { label: 'Falta autorizar el pago', verified: false, tone: 'warning' },
  PROCESSING: { label: 'Estamos verificando el pago', verified: false, tone: 'neutral' },
  SERVER_VERIFIED: { label: 'Pago verificado por RELEVO', verified: true, tone: 'success' },
  OFFLINE_RECEIPT_VERIFIED: { label: 'Recibo validado sin internet', verified: true, tone: 'success' },
  RECONCILED: { label: 'Pago conciliado', verified: true, tone: 'success' },
  FAILED: { label: 'No se completó el pago', verified: false, tone: 'danger' },
  EXPIRED: { label: 'Este cobro venció', verified: false, tone: 'warning' },
  INVALID_RECEIPT: { label: 'No podemos validar este recibo', verified: false, tone: 'danger' },
} as const

export function paymentPresentation(state: string) {
  return paymentStates[state as keyof typeof paymentStates] ?? { label: 'Estado no disponible', verified: false, tone: 'neutral' }
}
