import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAuthHeader } from '../firebase-compat';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

const UpgradePage = () => {
  const { user, upgradeToPro } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Redirect to home if not logged in
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setDemoMode(false);
    try {
      // Real flow: create a Stripe Checkout session and redirect to Stripe.
      // The webhook grants isPro in Firestore after payment.
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE}/api/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.url) {
        window.location.href = data.url; // off to Stripe Checkout
        return;
      }

      // Stripe not configured (demo / zero-config): fall back to the local
      // demo upgrade so the flow stays explorable without credentials.
      if (data.demo) {
        await upgradeToPro();
        setDemoMode(true);
        setSuccess(true);
        setTimeout(() => navigate('/'), 1500);
        return;
      }

      setError(data.error || 'Checkout is unavailable right now. Please try again.');
    } catch (err) {
      setError('Failed to process upgrade. Please try again.');
      console.error('Error upgrading to Pro:', err);
    } finally {
      setLoading(false);
    }
  };

  const ProCard = (
    <div className="w-full max-w-md space-y-8">
      <div>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-arcade-pink text-white flex items-center justify-center font-display text-[24px] border-2 border-arcade-ink shadow-brutal">
            👑
          </div>
        </div>
        <h2 className="text-center font-display text-[32px] tracking-brutal text-arcade-ink">
          Upgrade to PRISM Pro
        </h2>
        <p className="mt-2 text-center text-sm font-semibold text-arcade-ink/60">
          Unlock deep verification with multi-agent AI analysis
        </p>
      </div>
      <div className="bg-white border-2 border-arcade-ink shadow-brutal p-8 space-y-6">
        <div className="space-y-4">
          <h3 className="font-display text-lg tracking-widest uppercase text-center text-arcade-ink">
            Pro Features
          </h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <span className="w-6 h-6 bg-arcade-green text-white border-2 border-arcade-ink flex items-center justify-center text-[12px] font-bold shrink-0">
                ✓
              </span>
              <div className="ml-3">
                <p className="font-bold text-arcade-ink">Unlimited Deep Verification</p>
                <p className="text-sm font-medium text-arcade-ink/60">
                  Access full multi-agent analysis for any article
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="w-6 h-6 bg-arcade-blue text-arcade-ink border-2 border-arcade-ink flex items-center justify-center text-[12px] font-bold shrink-0">
                ✓
              </span>
              <div className="ml-3">
                <p className="font-bold text-arcade-ink">Priority Processing</p>
                <p className="text-sm font-medium text-arcade-ink/60">
                  Faster response times during peak hours
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="w-6 h-6 bg-arcade-pink text-white border-2 border-arcade-ink flex items-center justify-center text-[12px] font-bold shrink-0">
                ✓
              </span>
              <div className="ml-3">
                <p className="font-bold text-arcade-ink">Ad-Free Experience</p>
                <p className="text-sm font-medium text-arcade-ink/60">
                  Enjoy PRISM without any advertisements
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-arcade-ink">
            <p className="text-center text-sm font-semibold text-arcade-ink/60">
              Current plan: <span className="font-bold text-arcade-ink">Free (Limited)</span>
            </p>
            <p className="text-center text-sm font-semibold text-arcade-ink/60">
              Upgrade to Pro for just <span className="font-bold text-arcade-pink">$9.99/month</span>
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 bg-arcade-ink text-arcade-yellow font-bold text-sm border-2 border-arcade-ink shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Upgrade to Pro'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-3 px-4 bg-white text-arcade-ink font-bold text-sm border-2 border-arcade-ink shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      {error && (
        <div className="bg-white border-2 border-red-500 shadow-brutal text-red-600 p-4" role="alert">
          <p className="font-bold">⚠️ {error}</p>
        </div>
      )}
      {success && (
        <div className="bg-white border-2 border-arcade-green shadow-brutal text-arcade-green p-4" role="status">
          <p className="font-bold">🎉 Successfully upgraded to PRISM Pro! Redirecting...</p>
          {demoMode && (
            <p className="mt-1 text-sm font-medium text-arcade-ink/60">
              Demo mode: Stripe is not configured on this server, so no payment was processed.
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-arcade-yellow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {ProCard}
    </div>
  );
};

export default UpgradePage;
