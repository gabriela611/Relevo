/**
 * Amount helpers. Sales carry human decimals ("15.00") while Open Payments
 * carries integer minor units ("1500" with assetScale 2). All math is done on
 * BigInt to avoid floating point drift when deciding whether a sale is paid.
 */

const DECIMAL_RE = /^\d+(\.\d+)?$/;

export function isValidDecimalAmount(value: string): boolean {
  return typeof value === 'string' && DECIMAL_RE.test(value) && toMinorUnits(value, 18) > 0n;
}

/** "15.5", scale 2 -> 1550n. Throws if the value has more decimals than the scale allows. */
export function toMinorUnits(decimal: string, assetScale: number): bigint {
  if (!DECIMAL_RE.test(decimal)) {
    throw new Error(`Monto inválido: ${decimal}`);
  }
  const [whole, fraction = ''] = decimal.split('.');
  if (fraction.length > assetScale && /[1-9]/.test(fraction.slice(assetScale))) {
    throw new Error(`El monto ${decimal} tiene más decimales que la escala ${assetScale}.`);
  }
  const padded = fraction.slice(0, assetScale).padEnd(assetScale, '0');
  return BigInt(whole + padded);
}

/** 1550n or "1550", scale 2 -> "15.50" */
export function fromMinorUnits(minor: bigint | string, assetScale: number): string {
  const digits = BigInt(minor).toString().padStart(assetScale + 1, '0');
  if (assetScale === 0) return digits;
  return `${digits.slice(0, -assetScale)}.${digits.slice(-assetScale)}`;
}

/**
 * Exact comparison of two amounts that may use different scales:
 * returns true when a (minor units at scaleA) >= b (minor units at scaleB).
 */
export function isAtLeast(a: { value: string; assetScale: number }, b: { value: string; assetScale: number }): boolean {
  const scale = Math.max(a.assetScale, b.assetScale);
  const aNorm = BigInt(a.value) * 10n ** BigInt(scale - a.assetScale);
  const bNorm = BigInt(b.value) * 10n ** BigInt(scale - b.assetScale);
  return aNorm >= bNorm;
}

/** { value: '1500', assetCode: 'USD', assetScale: 2 } -> "15.00 USD" */
export function formatAmount(a: { value: string; assetCode: string; assetScale: number }): string {
  return `${fromMinorUnits(a.value, a.assetScale)} ${a.assetCode}`;
}

/**
 * Units of `receive` per 1 unit of `debit`, as a decimal string truncated to
 * `decimals` places. Pure BigInt: 1.00 USD for 1.90 EUR -> "0.526315".
 */
export function effectiveRate(
  debit: { value: string; assetScale: number },
  receive: { value: string; assetScale: number },
  decimals = 6
): string {
  const d = BigInt(debit.value);
  if (d <= 0n) throw new Error('El monto debitado debe ser positivo.');
  const scaled =
    (BigInt(receive.value) * 10n ** BigInt(debit.assetScale) * 10n ** BigInt(decimals)) /
    (d * 10n ** BigInt(receive.assetScale));
  return fromMinorUnits(scaled, decimals);
}
