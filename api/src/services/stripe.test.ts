/**
 * stripe.test.ts — verifies the Stripe webhook grant/revoke flow WITHOUT real
 * payments or a live Stripe/Firebase connection:
 *
 *   - Real signed payloads via `stripe.webhooks.generateTestHeaderString`
 *     (same SDK method Stripe uses for its own test tools), so signature
 *     verification is genuinely exercised.
 *   - Firestore mocked at the module boundary, capturing set/update calls.
 *
 * Flow under test:
 *   checkout.session.completed        → grantPro  → users/<uid>.set({ isPro: true })
 *   customer.subscription.deleted     → revokePro → users/<uid>.update({ isPro: false })
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import Stripe from 'stripe';

// Env must exist before ./stripe is imported (vi.hoisted runs before imports).
vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_webhook_unit_test';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  process.env.FIREBASE_SERVICE_ACCOUNT = '{}';
});

// Firestore mock — record every write so tests can assert grant/revoke calls.
const { fakeDb, writes } = vi.hoisted(() => {
  const writes: { docId: string; op: 'set' | 'update'; data: any }[] = [];
  const doc = {
    set: vi.fn(async (data: any) => {
      writes.push({ docId: 'user-123', op: 'set', data });
    }),
    update: vi.fn(async (data: any) => {
      writes.push({ docId: 'user-123', op: 'update', data });
    }),
    get: vi.fn(async () => ({ exists: false, data: () => undefined })),
  };
  const fakeDb = {
    collection: vi.fn(() => ({ doc: vi.fn(() => doc) })),
  };
  return { fakeDb, writes };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => fakeDb,
  FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
  Timestamp: class Timestamp {
    seconds: number;
    nanoseconds: number;
    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
    }
    toDate(): Date {
      return new Date(this.seconds * 1000);
    }
  },
}));

import { handleWebhook } from './stripe';

const stripe = new Stripe('sk_test_webhook_unit_test', { apiVersion: '2023-10-16' });
const WEBHOOK_SECRET = 'whsec_test_secret';

/** Sign a raw JSON payload exactly like Stripe's test tools do. */
function sign(payload: string): string {
  return stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
}

function makeRes() {
  const res: any = { body: null, statusCode: 200 };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((body: any) => {
    res.body = body;
    return res;
  });
  res.sendStatus = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  return res;
}

function makeReq(event: any, opts: { validSignature?: boolean } = {}) {
  const payload = JSON.stringify(event);
  return {
    req: {
      headers: {
        'stripe-signature': opts.validSignature === false ? 't=0,v1=badsignature' : sign(payload),
      },
      body: payload,
    } as any,
    payload,
  };
}

const completedEvent = (userId: string) => ({
  id: 'evt_checkout_completed_1',
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_1',
      object: 'checkout.session',
      client_reference_id: userId,
      customer: 'cus_test_1',
    },
  },
});

const deletedEvent = (userId: string) => ({
  id: 'evt_sub_deleted_1',
  object: 'event',
  type: 'customer.subscription.deleted',
  data: {
    object: {
      id: 'sub_test_1',
      object: 'subscription',
      metadata: { userId },
    },
  },
});

describe('stripe webhook — Pro grant/revoke flow', () => {
  beforeEach(() => {
    writes.length = 0;
    vi.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
  });

  it('grants Pro on checkout.session.completed', async () => {
    const { req } = makeReq(completedEvent('user-123'));
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });

    const grant = writes.find((w) => w.op === 'set');
    expect(grant).toBeDefined();
    expect(grant!.docId).toBe('user-123');
    expect(grant!.data.isPro).toBe(true);
  });

  it('revokes Pro on customer.subscription.deleted', async () => {
    const { req } = makeReq(deletedEvent('user-123'));
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.statusCode).toBe(200);
    const revoke = writes.find((w) => w.op === 'update');
    expect(revoke).toBeDefined();
    expect(revoke!.data.isPro).toBe(false);
  });

  it('does not revoke when the subscription has no userId metadata', async () => {
    const event = deletedEvent('user-123');
    (event.data.object as any).metadata = {};
    const { req } = makeReq(event);
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.statusCode).toBe(200);
    expect(writes).toHaveLength(0);
  });

  it('rejects a bad signature without touching Firestore', async () => {
    const { req } = makeReq(completedEvent('user-123'), { validSignature: false });
    const res = makeRes();
    await handleWebhook(req, res);

    expect(res.statusCode).toBe(400);
    expect(writes).toHaveLength(0);
  });

  it('rejects requests when the webhook secret is not configured', async () => {
    const saved = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    try {
      const { req } = makeReq(completedEvent('user-123'));
      const res = makeRes();
      await handleWebhook(req, res);
      expect(res.statusCode).toBe(400);
      expect(writes).toHaveLength(0);
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = saved;
    }
  });

  it('acks but ignores unhandled event types', async () => {
    const { req } = makeReq({ id: 'evt_1', object: 'event', type: 'invoice.payment_succeeded', data: { object: {} } });
    const res = makeRes();
    await handleWebhook(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(writes).toHaveLength(0);
  });
});
