import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { generateKeyPairSync } from 'node:crypto';
import { OpenPaymentsClientError, type AuthenticatedClient } from '@interledger/open-payments';
import { LiveOpenPaymentsGateway } from '../src/services/gateways/live.js';
import { isTransientOpenPaymentsError, withRetry } from '../src/services/gateways/retry.js';
import type { WalletInfo } from '../src/services/gateways/gateway.js';

const FAST = { retries: 2, baseDelayMs: 1 };
const quiet = () => {};

/** What the SDK throws when ky's request times out (no HTTP status). */
const timeoutError = () =>
  new OpenPaymentsClientError('Error making Open Payments POST request', { description: 'Request timed out: POST https://x' });
const httpError = (status: number) =>
  new OpenPaymentsClientError('Error making Open Payments POST request', { description: `HTTP ${status}`, status });

const payer: WalletInfo = {
  id: 'https://ilp.test/buyer',
  assetCode: 'EUR',
  assetScale: 2,
  authServer: 'https://auth.ilp.test',
  resourceServer: 'https://ilp.test',
};

// --- classification + backoff -------------------------------------------------

test('only timeouts, network errors, 5xx and 429 are transient', () => {
  assert.equal(isTransientOpenPaymentsError(timeoutError()), true);
  assert.equal(isTransientOpenPaymentsError(new TypeError('fetch failed')), true);
  assert.equal(isTransientOpenPaymentsError(httpError(503)), true);
  assert.equal(isTransientOpenPaymentsError(httpError(429)), true);
  assert.equal(isTransientOpenPaymentsError(httpError(400)), false);
  assert.equal(isTransientOpenPaymentsError(httpError(401)), false);
  assert.equal(isTransientOpenPaymentsError(httpError(403)), false);
  const validation = new OpenPaymentsClientError('x', { description: 'Could not validate OpenAPI response', validationErrors: ['bad'] });
  assert.equal(isTransientOpenPaymentsError(validation), false);
  assert.equal(isTransientOpenPaymentsError(new Error('logic bug')), false);
});

test('withRetry: up to 2 retries with exponential backoff, then gives up', async () => {
  let calls = 0;
  const delays: number[] = [];
  await assert.rejects(
    withRetry('x', async () => { calls++; throw timeoutError(); }, { retries: 2, baseDelayMs: 2 }, (i) => delays.push(i.delayMs)),
    OpenPaymentsClientError
  );
  assert.equal(calls, 3);
  assert.deepEqual(delays, [2, 4]);

  calls = 0;
  const value = await withRetry('x', async () => (++calls < 3 ? Promise.reject(timeoutError()) : 'ok'), FAST, quiet);
  assert.equal(value, 'ok');
  assert.equal(calls, 3);

  calls = 0;
  await assert.rejects(withRetry('x', async () => { calls++; throw httpError(400); }, FAST, quiet));
  assert.equal(calls, 1, '4xx must not be retried');
});

// --- real SDK client against a hanging server (mocked timeout) ----------------

const hits = { count: 0, respondOnHit: Infinity };
const server = http.createServer((req, res) => {
  hits.count++;
  if (hits.count < hits.respondOnHit) return; // never answer -> SDK request timeout
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ id: `${base}/alice`, publicName: 'Alice', assetCode: 'USD', assetScale: 2, authServer: `${base}/auth`, resourceServer: base }));
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
after(() => {
  server.closeAllConnections();
  server.close();
});

async function realGateway() {
  const { privateKey } = generateKeyPairSync('ed25519');
  const gw = await LiveOpenPaymentsGateway.create({
    walletAddressUrl: `${baseUrl}/relevo`,
    keyId: 'test-key',
    privateKey: privateKey as unknown as string,
    requestTimeoutMs: 150,
    retryPolicy: FAST,
  });
  return gw;
}

test('real SDK: requestTimeoutMs is applied and a timed-out wallet lookup is retried until it succeeds', async () => {
  hits.count = 0;
  hits.respondOnHit = 3; // first two requests hang past the 150 ms timeout
  const gw = await realGateway();
  const started = Date.now();
  const wallet = await gw.resolveWallet(`${baseUrl}/alice`);
  assert.equal(wallet.assetCode, 'USD');
  assert.equal(hits.count, 3);
  assert.ok(Date.now() - started >= 300, 'two timeouts of ~150 ms must have elapsed');
});

test('real SDK: gives up after 1 + 2 attempts and surfaces the timeout', async () => {
  hits.count = 0;
  hits.respondOnHit = Infinity;
  const gw = await realGateway();
  await assert.rejects(gw.resolveWallet(`${baseUrl}/alice`), (err: unknown) => {
    assert.ok(err instanceof OpenPaymentsClientError);
    assert.equal(err.status, undefined);
    return true;
  });
  assert.equal(hits.count, 3);
});

// --- unsafe calls are never retried -------------------------------------------

function fakeClient(overrides: Record<string, unknown>) {
  const calls: Record<string, number> = {};
  const count = (name: string, fn: (...a: any[]) => any) => (...a: any[]) => {
    calls[name] = (calls[name] ?? 0) + 1;
    return fn(...a);
  };
  const client = {
    grant: {
      request: count('grant.request', overrides['grant.request'] as any ?? (async () => { throw timeoutError(); })),
      continue: count('grant.continue', overrides['grant.continue'] as any ?? (async () => { throw timeoutError(); })),
    },
    outgoingPayment: {
      create: count('outgoingPayment.create', overrides['outgoingPayment.create'] as any ?? (async () => { throw timeoutError(); })),
    },
  } as unknown as AuthenticatedClient;
  return { client, calls };
}

test('grant.continue that times out is called exactly once', async () => {
  const { client, calls } = fakeClient({});
  const gw = LiveOpenPaymentsGateway.withClient(client, FAST);
  await assert.rejects(gw.continueGrantAndPay({ payer, continueUri: 'u', continueToken: 't', interactRef: 'r', quoteId: 'q' }));
  assert.equal(calls['grant.continue'], 1);
  assert.equal(calls['outgoingPayment.create'], undefined);
});

test('outgoingPayment.create that times out is called exactly once', async () => {
  const { client, calls } = fakeClient({
    'grant.continue': async () => ({ access_token: { value: 'tok', manage: 'm', access: [] }, continue: { uri: 'u', access_token: { value: 'c' } } }),
  });
  const gw = LiveOpenPaymentsGateway.withClient(client, FAST);
  await assert.rejects(gw.continueGrantAndPay({ payer, continueUri: 'u', continueToken: 't', interactRef: 'r', quoteId: 'q' }), OpenPaymentsClientError);
  assert.equal(calls['grant.continue'], 1);
  assert.equal(calls['outgoingPayment.create'], 1);
});

test('the interactive outgoing-payment grant (buyer consent) is not retried', async () => {
  const { client, calls } = fakeClient({});
  const gw = LiveOpenPaymentsGateway.withClient(client, FAST);
  await assert.rejects(gw.requestOutgoingGrant(payer, { value: '100', assetCode: 'EUR', assetScale: 2 }, { uri: 'https://cb', nonce: 'n' }));
  assert.equal(calls['grant.request'], 1);
});

test('the non-interactive quote grant is retried', async () => {
  const { client, calls } = fakeClient({});
  const gw = LiveOpenPaymentsGateway.withClient(client, FAST);
  await assert.rejects(gw.createQuote(payer, 'https://ilp.test/incoming-payments/1'));
  assert.equal(calls['grant.request'], 3);
});
