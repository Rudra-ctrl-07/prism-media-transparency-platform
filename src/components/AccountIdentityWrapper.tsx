/**
 * AccountIdentity wrapper with default props.
 * The merged component requires complex handlers (Drive export, Sheets sync,
 * note management) that we provide as no-op defaults so the page renders
 * without an active Google Drive/Sheets integration.
 *
 * Also fetches the user's live subscription state (GET /api/stripe/subscription)
 * so the Account page shows real Pro status instead of a hardcoded badge.
 */

import React, { useCallback, useEffect, useState } from 'react';
import AccountIdentity from './AccountIdentity';
import { useAuth } from '../firebase';
import { getAuthHeader } from '../firebase-compat';
import type { UserProfile, KeepNote, SubscriptionState } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

const defaultProfile: UserProfile = {
  fullName: 'PRISM Analyst',
  email: 'analyst@prism.local',
  organization: 'PRISM',
  location: '',
  subscriptionStatus: 'Free',
  biasAlerts: { highBias: true, conflictOfInterest: true, sourceVolatility: true },
};

const AccountIdentityWrapper: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [notes] = useState<KeepNote[]>([]);
  const [driveFiles] = useState<any[]>([]);
  const [sheetsSyncLogs] = useState<any[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE}/api/stripe/subscription`, { headers: authHeader });
      if (res.ok) {
        const state = (await res.json()) as SubscriptionState;
        setSubscription(state);
        // Keep the legacy profile badge in sync with the real plan.
        setProfile((p) => ({ ...p, subscriptionStatus: state.isPro ? 'Trust Pro' : 'Free' }));
      }
    } catch (e) {
      console.error('Failed to load subscription state:', e);
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  return (
    <AccountIdentity
      user={user}
      profile={profile}
      setProfile={setProfile}
      onSaveProfile={async () => {}}
      notes={notes}
      onSaveNote={async () => {}}
      onDeleteNote={async () => {}}
      onGenerateNoteImage={async () => ''}
      driveFiles={driveFiles}
      sheetsSyncLogs={sheetsSyncLogs}
      isGeneratingImage={isGeneratingImage}
      onLogin={() => {
        window.location.href = '/login';
      }}
      subscription={subscription}
      subLoading={subLoading}
      onRefreshSubscription={refreshSubscription}
    />
  );
};

export default AccountIdentityWrapper;
