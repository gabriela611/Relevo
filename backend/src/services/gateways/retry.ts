import { OpenPaymentsClientError } from '@interledger/open-payments';

export interface RetryPolicy {
  /** Extra attempts after the first one. */
  retries: number;
  /** Backoff before retry n is baseDelayMs * 2^(n-1). */
  baseDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = { retries: 2, baseDelayMs: 500 };

/**
 * Transient = worth retrying: no HTTP response at all (timeout / network; the SDK
 * wraps ky's TimeoutError without a status), 5xx, or 429. A 4xx or an OpenAPI
 * validation error means the request itself is wrong, so retrying can't help.
 */
export function isTransientOpenPaymentsError(err: unknown): boolean {
  if (err instanceof OpenPaymentsClientError) {
    if (err.validationErrors?.length) return false;
    if (err.status === undefined) return true;
    return err.status >= 500 || err.status === 429;
  }
  // Raw network failures (e.g. fetch TypeError) that escaped the SDK wrapper.
  return err instanceof TypeError;
}

/**
 * Runs `fn`, retrying transient failures with exponential backoff. Use ONLY for
 * calls that are safe to repeat: reads, non-interactive grants, and creates
 * whose duplicates are harmless (an unpaid incoming payment, an unused quote).
 * Never wrap grant.continue or outgoingPayment.create: a retry after a timeout
 * whose request actually succeeded could consume the grant or pay twice.
 */
export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  onRetry: (info: { label: string; attempt: number; delayMs: number; error: unknown }) => void = logRetry
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt > policy.retries || !isTransientOpenPaymentsError(error)) throw error;
      const delayMs = policy.baseDelayMs * 2 ** (attempt - 1);
      onRetry({ label, attempt, delayMs, error });
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

function logRetry({ label, attempt, delayMs, error }: { label: string; attempt: number; delayMs: number; error: unknown }) {
  const e = error as { description?: string; message?: string; status?: number };
  const why = e?.status ? `HTTP ${e.status}` : e?.description || e?.message || 'error';
  console.warn(`↻ Open Payments ${label} failed (${why}); retry ${attempt} in ${delayMs} ms`);
}
