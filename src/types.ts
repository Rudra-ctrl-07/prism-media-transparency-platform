/**
 * Unified types for PRISM (merged from New_Prizm + Prizm_Large + prism).
 * Provides a single source of truth for Article, Source, BiasAxes, and
 * supporting interfaces consumed by both the frontend components and
 * (via JSON) the Express backend.
 */

export interface AgentFinding {
  text: string;
  label: string;
}

export interface BiasAnalysis {
  progressive: AgentFinding;
  conservative: AgentFinding;
  omission: AgentFinding;
  moderator: AgentFinding;
}

/** Numeric 0-100 axes for the standardized BiasCompass primitive. */
export interface BiasAxes {
  Emotion: number;
  Omission: number;
  Framing: number;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  category: 'Home' | 'Business' | 'Politics' | 'Science' | 'Tech';
  sourceName: string;
  sourceCredibility: number;
  biasRating: 'Left' | 'Center-Left' | 'Center' | 'Center-Right' | 'Right';
  verificationStatus: 'VERIFIED' | 'MISLEADING' | 'PENDING' | 'UNVERIFIED';
  verificationTier?: 'basic' | 'deep';
  verifiedBy?: 'classical-ml' | 'gemini' | 'claude';
  aiInsight?: string;
  timestamp: string;
  /** Original article link (used by the backend / RSS ingestion). */
  url?: string;
  /** Original article link (backend field name from RSS ingestion). */
  link?: string;
  groundingUrls?: Array<{ uri: string; title: string }>;
  biasAnalysis?: BiasAnalysis;
  biasAxes?: BiasAxes;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
}

export interface Source {
  id: string;
  name: string;
  credibility: number;
  biasRating: 'Left' | 'Center-Left' | 'Center' | 'Center-Right' | 'Right';
  verificationStatus: string;
  category: string;
  logoUrl?: string;
  verifiedCount: number;
  flaggedCount: number;
  description: string;
}

export interface KeepNote {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  category?: string;
  isPinned: boolean;
  timestamp: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  organization: string;
  location: string;
  subscriptionStatus: 'Free' | 'Trust Pro' | 'Enterprise Verified';
  biasAlerts: {
    highBias: boolean;
    conflictOfInterest: boolean;
    sourceVolatility: boolean;
  };
}

/** Subscription state returned by GET /api/stripe/subscription. */
export interface SubscriptionState {
  isPro: boolean;
  plan: 'Pro' | 'Free';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none' | 'unknown';
  proSince?: string;
  stripeCustomerId?: string;
  demo?: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: { reviewSnippets?: Array<{ text: string }> };
  };
}

/** String-based debate shape used by the verification UI and backend. */
export interface DebateResult {
  progressive: string;
  conservative: string;
  omissionFocused: string;
  moderatorVerdict: string;
  confidence: number; // 0-1
}

export interface VerificationResult {
  articleId: string;
  status: 'VERIFIED' | 'MISLEADING' | 'PENDING' | 'UNVERIFIED';
  credibility: number;
  debate?: DebateResult;
  confidence: number;
  timestamp: string;
}