import { GoogleGenAI } from "@google/genai";
import redis from './redis';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

// Types for our verification results
export interface VerificationResult {
  // Basic info (from article)
  articleId: string;
  title: string;
  source: string;
  sourceCredibility: number; // 0-1
  summary: string;
  // Deep verification details (only present if deep=true)
  debate?: {
    progressive: string;
    conservative: string;
    omissionFocused: string;
    moderatorVerdict: string;
    confidence: number; // 0-1
  };
  verificationTimestamp: number; // unix timestamp
  verificationType: 'basic' | 'deep';
}

const inMemoryCache = new Map<string, string>();

// Initialize Gemini API
const genAI = process.env.GOOGLE_API_KEY ? new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY }) : null;
const model = genAI
  ? // @ts-ignore — getGenerativeModel is part of legacy API
    (genAI as any).getGenerativeModel?.({ model: 'gemini-1.5-flash' }) ?? genAI
  : null;

/**
 * Get cached deep verification result for an article
 */
export async function getCachedVerification(articleId: string): Promise<VerificationResult | null> {
  const key = `verification:${articleId}:deep`;
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return typeof cached === 'string' ? JSON.parse(cached) : (cached as any);
      }
    } catch (err) {
      console.warn('Redis get failed, checking in-memory cache:', err);
    }
  }
  const memoryCached = inMemoryCache.get(key);
  if (memoryCached) {
    return JSON.parse(memoryCached);
  }
  return null;
}

/**
 * Cache a deep verification result for an article
 * @param ttl Optional time to live in seconds (default: 1 hour)
 */
export async function cacheVerification(
  articleId: string,
  data: Omit<VerificationResult, 'verificationTimestamp' | 'verificationType'> & { verificationType: 'deep' },
  ttl: number = 3600
): Promise<void> {
  const key = `verification:${articleId}:deep`;
  const value = JSON.stringify({
    ...data,
    verificationTimestamp: Date.now(),
    verificationType: 'deep',
  });
  inMemoryCache.set(key, value);
  if (redis) {
    try {
      await redis.setex(key, ttl, value);
    } catch (err) {
      console.warn('Redis setex failed, stored in in-memory cache:', err);
    }
  }
}

/**
 * Get basic verification info from article data (this would come from Firestore)
 * In a real implementation, this would fetch the article from Firestore and format it.
 * For now, we assume the caller will pass in the article data.
 */
export function getBasicVerification(article: any): VerificationResult {
  return {
    articleId: article.id,
    title: article.title,
    source: article.source,
    sourceCredibility: article.sourceCredibility || 0.5,
    summary: article.summary || '',
    verificationTimestamp: Date.now(),
    verificationType: 'basic',
  };
}

/**
 * Generate a comprehensive analysis prompt for Gemini
 */
function generateAnalysisPrompt(article: any): string {
  return `
You are an expert media analyst tasked with providing a balanced, multi-perspective analysis of a news article.

Analyze the following article from three distinct perspectives:
1. Progressive/Liberal viewpoint
2. Conservative/Conservative viewpoint
3. Omission-focused perspective (what important context or viewpoints might be missing)

For each perspective, provide a thoughtful analysis. Then provide a moderator's verdict that synthesizes the perspectives and gives a confidence score.

Article Title: ${article.title}
Article Source: ${article.source}
Article Summary: ${article.summary}

Please provide your analysis in the following JSON format:
{
  "progressive": "Your analysis from a progressive/liberal perspective...",
  "conservative": "Your analysis from a conservative perspective...",
  "omissionFocused": "What important context, viewpoints, or facts might be missing or underemphasized...",
  "moderatorVerdict": "A balanced synthesis of the perspectives with your overall assessment...",
  "confidence": 0.85
}

Ensure your response is valid JSON only, with no additional text before or after.
`;
}

/**
 * Call Gemini API for deep verification.
 */
export async function callLLMForDeepVerification(article: any): Promise<VerificationResult['debate']> {
  try {
    // If no API key is configured, fall back to mock implementation
    if (!process.env.GOOGLE_API_KEY) {
      console.warn('Google API key not configured, using mock LLM response');
      return await mockLLMResponse(article);
    }

    const prompt = generateAnalysisPrompt(article);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse the JSON response
    try {
      const cleanedText = text.trim()
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '');

      const parsed = JSON.parse(cleanedText);

      // Validate the response has required fields
      if (!parsed.progressive || !parsed.conservative || !parsed.omissionFocused ||
          !parsed.moderatorVerdict || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid response format from LLM');
      }

      // Ensure confidence is between 0 and 1
      const confidence = Math.max(0, Math.min(1, parsed.confidence));

      return {
        progressive: parsed.progressive,
        conservative: parsed.conservative,
        omissionFocused: parsed.omissionFocused,
        moderatorVerdict: parsed.moderatorVerdict,
        confidence: confidence
      };
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON:', parseError);
      console.error('Raw response:', text);
      // Fallback to mock response on parsing error
      return await mockLLMResponse(article);
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // Fallback to mock response on API error
    return await mockLLMResponse(article);
  }
}

/**
 * Mock LLM response (fallback when API is not available)
 */
async function mockLLMResponse(article: any): Promise<VerificationResult['debate']> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock response based on article title or content
  const title = article.title.toLowerCase();

  // Simple mock logic: generate different responses based on keywords
  let progressive, conservative, omissionFocused, moderatorVerdict;
  let confidence = 0.75 + Math.random() * 0.2; // between 0.75 and 0.95

  if (title.includes('climate') || title.includes('environment')) {
    progressive = "The article accurately represents the scientific consensus on climate change and highlights the urgent need for policy action.";
    conservative = "While acknowledging climate change, the article overstates the immediacy of threats and underestimates the economic costs of rapid transition.";
    omissionFocused = "The article omits discussion of technological innovations in carbon capture and nuclear energy that could mitigate climate impacts.";
    moderatorVerdict = "The article presents a scientifically accurate view with a slight emphasis on urgency; readers should consider both technological solutions and economic impacts.";
  } else if (title.includes('election') || title.includes('vote')) {
    progressive = "The article highlights important concerns about voter suppression and election integrity that deserve attention.";
    conservative = "The article overemphasizes isolated incidents while ignoring the overall security and fairness of the electoral process.";
    omissionFocused = "The article does not mention the record voter turnout in recent elections or the success of existing security measures.";
    moderatorVerdict = "The article raises valid points about election integrity but lacks context about the robustness of the voting system.";
  } else if (title.includes('economy') || title.includes('inflation') || title.includes('jobs')) {
    progressive = "The article correctly identifies the disproportionate impact of economic policies on marginalized communities.";
    conservative = "The article overlooks the positive effects of recent fiscal policies on job creation and economic growth.";
    omissionFocused = "The article fails to consider the role of global supply chain dynamics in current economic conditions.";
    moderatorVerdict = "The article presents a partial view of economic realities; a balanced view requires considering both domestic policy and global factors.";
  } else {
    // Generic response
    progressive = "The article presents a progressive perspective that highlights social justice and equity considerations.";
    conservative = "The article presents a conservative perspective that emphasizes traditional values and economic freedom.";
    omissionFocused = "The article omits alternative viewpoints and contextual factors that would provide a more complete picture.";
    moderatorVerdict = "The article presents a viewpoint that leans toward one perspective; readers should seek additional sources for a balanced understanding.";
  }

  return {
    progressive,
    conservative,
    omissionFocused,
    moderatorVerdict,
    confidence,
  };
}

/**
 * Get verification result for an article, either from cache or by computing it.
 * @param article The article object from Firestore
 * @param forceDeep If true, skip cache and compute fresh deep verification
 */
export async function getVerification(
  article: any,
  forceDeep: boolean = false
): Promise<VerificationResult> {
  // If not forcing deep, we can return basic info immediately (no need to check cache for basic)
  if (!forceDeep) {
    return getBasicVerification(article);
  }

  // For deep verification, check cache first
  const cached = await getCachedVerification(article.id);
  if (cached) {
    return cached;
  }

  // Not in cache, compute using LLM
  const debate = await callLLMForDeepVerification(article);
  const result: Omit<VerificationResult, 'verificationTimestamp' | 'verificationType'> & { verificationType: 'deep' } = {
    articleId: article.id,
    title: article.title,
    source: article.source,
    sourceCredibility: article.sourceCredibility || 0.5,
    summary: article.summary || '',
    debate,
    verificationType: 'deep'
  };

  // Cache the result
  await cacheVerification(article.id, result);

  // Return with metadata
  return {
    ...result,
    verificationTimestamp: Date.now()
  };
}