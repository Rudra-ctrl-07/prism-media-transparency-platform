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

// Numeric 0-100 axes for the standardized BiasCompass primitive.
// Source: backend /api/gemini/analyze response `biasAxes` field.
// Three named, non-political dimensions per design brief — see design/tokens.ts.
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
  category: "Home" | "Business" | "Politics" | "Science" | "Tech";
  sourceName: string;
  sourceCredibility: number;
  biasRating: "Left" | "Center-Left" | "Center" | "Center-Right" | "Right";
  verificationStatus: "VERIFIED" | "MISLEADING" | "PENDING" | "UNVERIFIED";
  verificationTier?: "basic" | "deep";
  verifiedBy?: "classical-ml" | "gemini" | "claude";
  aiInsight?: string;
  timestamp: string;
  groundingUrls?: Array<{ uri: string; title: string }>;
  biasAnalysis?: BiasAnalysis;
  biasAxes?: BiasAxes;
}

export interface Source {
  id: string;
  name: string;
  credibility: number; // 0-100
  biasRating: "Left" | "Center-Left" | "Center" | "Center-Right" | "Right";
  verificationStatus: "Fully Provenance-Clear" | "Requires Secondary Review" | "Source-Volatile";
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
  subscriptionStatus: "Free" | "Trust Pro" | "Enterprise Verified";
  biasAlerts: {
    highBias: boolean;
    conflictOfInterest: boolean;
    sourceVolatility: boolean;
  };
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: Array<{ text: string }>;
    };
  };
}
