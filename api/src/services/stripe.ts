import Stripe from 'stripe';
import { config as dotenvConfig } from 'dotenv';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

dotenvConfig();

/** True when Firebase Admin is usable for persisting subscription state. */
function isFirebaseConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

/** User-facing subscription state returned to the Account page. */
export interface SubscriptionState {
  /** True when the user currently has Pro access. */
  isPro: boolean;
  plan: 'Pro' | 'Free';
  /** Stripe subscription status, or 'none' when not subscribed. */
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none' | 'unknown';
  /** When Pro was granted (ISO string). */
  proSince?: string;
  /** Stripe customer id, when known (for manage-portal links). */
  stripeCustomerId?: string;
  /** True when the API runs in zero-config demo mode (no real billing). */
  demo?: boolean;
}

/**
 * Lazy Stripe client — never throws at import time so the API boots in
 * zero-config mode without a key. Requests fail with a clear message when
 * STRIPE_SECRET_KEY is missing.
 */
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
}

/**
 * Create a Stripe Checkout session for a Pro subscription.
 * The user id travels as `client_reference_id` AND inside subscription
 * metadata so the webhook can grant/revoke Pro for the right user.
 */
export const createCheckoutSession = async (
  userId: string,
  opts: { priceId?: string; customerEmail?: string } = {},
): Promise<string> => {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing)');

  const priceId = opts.priceId || process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error('No Stripe price id configured (STRIPE_PRICE_ID missing)');

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${frontendUrl}/upgrade?success=1`,
    cancel_url: `${frontendUrl}/upgrade?cancelled=1`,
    client_reference_id: userId,
    ...(opts.customerEmail ? { customer_email: opts.customerEmail } : {}),
    subscription_data: { metadata: { userId } },
  });

  if (!session.url) throw new Error('Stripe returned no checkout URL');
  return session.url;
};

/** Grant Pro to a user in Firestore (idempotent merge). */
async function grantPro(userId: string): Promise<void> {
  if (!isFirebaseConfigured() || !userId) return;
  await getFirestore()
    .collection('users')
    .doc(userId)
    .set(
      {
        isPro: true,
        proSince: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

/** Revoke Pro from a user in Firestore. */
async function revokePro(userId: string): Promise<void> {
  if (!isFirebaseConfigured() || !userId) return;
  await getFirestore().collection('users').doc(userId).update({
    isPro: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Resolve the current subscription state for a user.
 *
 * Reads the Firestore `users/<uid>` doc (granted/revoked by the webhook) and,
 * when a Stripe key + customer id are available, cross-checks the live Stripe
 * subscription status (active / trialing / past_due / canceled) so the Account
 * page can show real billing state, not just the stored flag.
 */
export async function getSubscriptionState(userId: string): Promise<SubscriptionState> {
  // Zero-config mode: no real billing, treat as demo Pro so the app stays
  // fully explorable (mirrors authorizePro's pass-through).
  if (!isFirebaseConfigured()) {
    return { isPro: true, plan: 'Pro', status: 'active', demo: true };
  }

  try {
    const doc = await getFirestore().collection('users').doc(userId).get();
    const data = doc.exists ? doc.data() : undefined;
    const storedIsPro = Boolean(data?.isPro);
    const stripeCustomerId = data?.stripeCustomerId as string | undefined;
    const proSinceRaw = data?.proSince;
    const proSince =
      proSinceRaw instanceof Timestamp
        ? proSinceRaw.toDate().toISOString()
        : typeof proSinceRaw === 'string'
        ? proSinceRaw
        : undefined;

    let status: SubscriptionState['status'] = storedIsPro ? 'active' : 'none';

    // Best-effort live check against Stripe when we have a customer id.
    if (storedIsPro && stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
      const stripe = getStripe();
      if (stripe) {
        try {
          const subs = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: 'all',
            limit: 1,
          });
          const sub = subs.data[0];
          if (sub) {
            const s = sub.status;
            status =
              s === 'active'
                ? 'active'
                : s === 'trialing'
                ? 'trialing'
                : s === 'past_due'
                ? 'past_due'
                : s === 'canceled' || s === 'unpaid'
                ? 'canceled'
                : 'unknown';
          }
        } catch (err) {
          console.warn('[stripe] Live subscription check failed, using stored flag:', (err as Error).message);
        }
      }
    }

    // If Stripe says the subscription is gone, the stored flag is stale.
    const isPro = storedIsPro && status !== 'canceled';
    return {
      isPro,
      plan: isPro ? 'Pro' : 'Free',
      status,
      proSince,
      stripeCustomerId,
    };
  } catch (err) {
    console.error('[stripe] Failed to resolve subscription state:', (err as Error).message);
    return { isPro: false, plan: 'Free', status: 'unknown' };
  }
}

export const handleWebhook = async (req: any, res: any) => {
  const sig = req.headers['stripe-signature'];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' });
  }
  const stripe = getStripe();
  if (!stripe) return res.status(400).json({ error: 'Stripe is not configured' });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return res.sendStatus(400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id as string;
        await grantPro(userId);
        console.log(`User ${userId} has subscribed to Pro.`);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = (sub.metadata as any)?.userId as string | undefined;
        if (userId) {
          await revokePro(userId);
          console.log(`User ${userId} subscription cancelled — Pro revoked.`);
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  res.json({ received: true });
};
