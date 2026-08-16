/**
 * routes/stripe.ts — Stripe checkout endpoints for the Pro tier.
 *
 *   POST /api/stripe/checkout  → create a subscription checkout session
 *                                for the authenticated user, returns { url }
 *
 * The webhook (`POST /api/stripe/webhook`, mounted raw in app.ts) receives
 * the payment confirmation and grants `isPro` in Firestore, which is what
 * `authorizePro` checks when gating paid features like the content agent.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createCheckoutSession, getSubscriptionState } from '../services/stripe';

export const stripeRouter = Router();

/**
 * Get the signed-in user's subscription state for the Account page.
 * Returns the plan, Stripe status, and when Pro started.
 */
stripeRouter.get('/subscription', authenticate, async (req: any, res: any) => {
  // Zero-config mode: no Firebase, no real billing — return demo Pro state so
  // the Account page renders (mirrors authorizePro's pass-through).
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return res.json(await getSubscriptionState('demo-user'));
  }
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const state = await getSubscriptionState(uid);
    res.json(state);
  } catch (error: any) {
    console.error('[/api/stripe/subscription] error:', error);
    res.status(500).json({ error: error.message || 'Failed to load subscription state' });
  }
});

/** Create a Pro subscription checkout session for the signed-in user. */
stripeRouter.post('/checkout', authenticate, async (req: any, res: any) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return res.status(503).json({
      error: 'Stripe checkout is not configured on this server.',
      demo: true,
    });
  }

  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Authentication required' });

  try {
    const url = await createCheckoutSession(uid, {
      customerEmail: req.user?.email || undefined,
    });
    res.json({ url });
  } catch (error: any) {
    console.error('[/api/stripe/checkout] error:', error);
    res.status(500).json({ error: error.message || 'Checkout session creation failed' });
  }
});
