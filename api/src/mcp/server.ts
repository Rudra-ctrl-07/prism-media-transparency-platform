import { Request, Response } from 'express';
import { getFirestore, Timestamp, FieldValue, DocumentData } from 'firebase-admin/firestore';
import { getVerification } from '../services/llmRouter';
import nlp from 'compromise';

function getDb() {
  try {
    return getFirestore();
  } catch (e) {
    return null;
  }
}

const db = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_target, prop) {
    const instance = getDb();
    if (!instance) return undefined;
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

// Helper functions for sentiment analysis and topic clustering
function analyzeSentiment(text: string) {
  if (!text || typeof text !== 'string') {
    return {
      score: 0,
      comparative: 0,
      positive: 0,
      negative: 0,
      neutral: 0
    };
  }

  try {
    const doc = nlp(text);
    const sentiment = doc.sentiment();

    // Calculate various sentiment metrics
    const words = doc.terms().out('array');
    const positiveWords = doc.match('positive').terms().out('array').length;
    const negativeWords = doc.match('negative').terms().out('array').length;

    return {
      score: sentiment.score, // -1 to 1
      comparative: sentiment.comparative, // -1 to 1 per word
      positive: words.length > 0 ? positiveWords / words.length : 0,
      negative: words.length > 0 ? negativeWords / words.length : 0,
      neutral: words.length > 0 ? (words.length - positiveWords - negativeWords) / words.length : 0
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return {
      score: 0,
      comparative: 0,
      positive: 0,
      negative: 0,
      neutral: 0
    };
  }
}

function extractTopicsFromTexts(texts: string[], numTopics = 5) {
  if (!texts || texts.length === 0) {
    return [];
  }

  try {
    // Combine all texts
    const combinedText = texts.join(' ');

    // Process with compromise
    const doc = nlp(combinedText);

    // Get nouns and noun phrases as potential topics
    const nouns = doc.nouns().out('array');
    const nounPhrases = doc.nounPhrases().out('array');

    // Combine and filter
    let allTerms = [...nouns, ...nounPhrases];

    // Filter out common words and short terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
      'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
      'said', 'says', 'according', 'report', 'reports', 'reporting'
    ]);

    allTerms = allTerms
      .filter((term: string) => {
        if (typeof term !== 'string' || term.length < 3) return false;
        const lowerTerm = term.toLowerCase();
        return !stopWords.has(lowerTerm) && !/^\d+$/.test(term);
      })
      .map((term: string) => term.trim())
      .filter((term: string, index: number, self: string[]) =>
        index === self.indexOf(term) // Remove duplicates
      );

    // Count frequencies
    const frequencyMap: Record<string, number> = {};
    allTerms.forEach((term: string) => {
      frequencyMap[term] = (frequencyMap[term] || 0) + 1;
    });

    // Sort by frequency and return top topics
    return Object.entries(frequencyMap)
      .sort(([, count1], [, count2]) => count2 - count1)
      .slice(0, numTopics)
      .map(([term, count]) => ({ term, frequency: count }));
  } catch (error) {
    console.error('Error extracting topics:', error);
    return [];
  }
}

// Types for our verification results (matching llmRouter.ts)
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

/**
 * Get MCP server capabilities
 */
export const getMCPCapabilities = async (_req: Request, res: Response) => {
  try {
    const capabilities = {
      protocolVersion: "2024-11-05",
      capabilities: {
        resources: {
          listChanged: true,
          // We support these URI patterns
          resourceTemplates: [
            {
              uriTemplate: "prism://article/{articleId}",
              name: "Article Resource",
              description: "Access a specific article by ID"
            },
            {
              uriTemplate: "prism://articles",
              name: "Articles Collection",
              description: "Browse and search articles"
            }
          ]
        },
        tools: {
          listChanged: true,
          // We offer these tools
          tools: [
            {
              name: "verifyArticle",
              description: "Get verification analysis for an article (basic or deep)",
              inputSchema: {
                type: "object",
                properties: {
                  articleId: {
                    type: "string",
                    description: "The ID of the article to verify"
                  },
                  deep: {
                    type: "boolean",
                    description: "Whether to perform deep verification (requires Pro subscription)",
                    default: false
                  }
                },
                required: ["articleId"]
              }
            },
            {
              name: "searchArticles",
              description: "Search and filter articles with various criteria",
              inputSchema: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Search query to match against article titles and content"
                  },
                  sources: {
                    type: "array",
                    items: { type: "string" },
                    description: "Filter by news sources"
                  },
                  startDate: {
                    type: "string",
                    format: "date-time",
                    description: "Only include articles published after this date"
                  },
                  endDate: {
                    type: "string",
                    format: "date-time",
                    description: "Only include articles published before this date"
                  },
                  minCredibility: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Minimum source credibility score (0-1)"
                  },
                  limit: {
                    type: "integer",
                    minimum: 1,
                    maximum: 100,
                    default: 20,
                    description: "Maximum number of articles to return"
                  },
                  offset: {
                    type: "integer",
                    minimum: 0,
                    default: 0,
                    description: "Offset for pagination"
                  },
                  sortBy: {
                    type: "string",
                    enum: ["publishedAt", "sourceCredibility", "title"],
                    default: "publishedAt",
                    description: "Field to sort results by"
                  },
                  sortOrder: {
                    type: "string",
                    enum: ["asc", "desc"],
                    default: "desc",
                    description: "Sort order"
                  }
                }
              }
            },
            {
              name: "getTrendingTopics",
              description: "Get trending topics based on recent article analysis",
              inputSchema: {
                type: "object",
                properties: {
                  timeframe: {
                    type: "string",
                    enum: ["hour", "day", "week", "month"],
                    default: "day",
                    description: "Time period to analyze for trends"
                  },
                  limit: {
                    type: "integer",
                    minimum: 1,
                    maximum: 50,
                    default: 10,
                    description: "Maximum number of topics to return"
                  }
                }
              }
            },
            {
              name: "analyzeSentiment",
              description: "Analyze sentiment of articles based on text content",
              inputSchema: {
                type: "object",
                properties: {
                  articleId: {
                    type: "string",
                    description: "The ID of the article to analyze"
                  },
                  analyzeTitle: {
                    type: "boolean",
                    description: "Whether to analyze the article title",
                    default: true
                  },
                  analyzeSummary: {
                    type: "boolean",
                    description: "Whether to analyze the article summary",
                    default: true
                  },
                  analyzeContent: {
                    type: "boolean",
                    description: "Whether to analyze the article content (if available)",
                    default: false
                  }
                },
                required: ["articleId"]
              }
            },
            {
              name: "clusterTopics",
              description: "Cluster articles by topic similarity",
              inputSchema: {
                type: "object",
                properties: {
                  numClusters: {
                    type: "integer",
                    minimum: 2,
                    maximum: 20,
                    default: 5,
                    description: "Number of topic clusters to generate"
                  },
                  timeframe: {
                    type: "string",
                    enum: ["hour", "day", "week", "month"],
                    default: "week",
                    description: "Time period to analyze for topics"
                  },
                  limit: {
                    type: "integer",
                    minimum: 10,
                    maximum: 200,
                    default: 50,
                    description: "Maximum number of articles to analyze"
                  },
                  minSimilarity: {
                    type: "number",
                    minimum: 0.1,
                    maximum: 0.9,
                    default: 0.3,
                    description: "Minimum similarity threshold for clustering (0.1-0.9)"
                  }
                }
              }
            },
            {
              name: "getGeographicDistribution",
              description: "Get geographic distribution of articles based on detected locations",
              inputSchema: {
                type: "object",
                properties: {
                  startDate: {
                    type: "string",
                    format: "date-time",
                    description: "Start date for article selection"
                  },
                  endDate: {
                    type: "string",
                    format: "date-time",
                    description: "End date for article selection"
                  },
                  limit: {
                    type: "integer",
                    minimum: 1,
                    maximum: 100,
                    default: 50,
                    description: "Maximum number of locations to return"
                  }
                }
              }
            }
          ]
        }
      },
      instructions: "PRISM Media Transparency Verification Service. Use the verifyArticle tool to analyze articles for bias and credibility. Access articles via resources at prism://article/{articleId} or browse the collection at prism://articles."
    };

    res.json(capabilities);
  } catch (error) {
    console.error('Error getting MCP capabilities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get article as MCP resource
 */
export const getArticleResource = async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;

    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    // Check if Firestore is initialized
    const dbInstance = getDb();
    if (!dbInstance) {
      return res.status(503).json({ error: 'Firestore service unavailable' });
    }

    const doc = await dbInstance.collection('articles').doc(articleId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const articleData = doc.data();
    if (!articleData) {
      return res.status(404).json({ error: 'Article data not found' });
    }

    // Format as MCP resource
    const resource = {
      uri: `prism://article/${articleId}`,
      name: articleData.title || 'Untitled Article',
      description: `Article from ${articleData.source || 'Unknown Source'}`,
      mimeType: "application/json",
      text: JSON.stringify(articleData, null, 2)
    };

    res.json(resource);
  } catch (error) {
    console.error('Error getting article resource:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify article (MCP tool)
 */
export const verifyArticleTool = async (req: Request, res: Response) => {
  try {
    const { articleId, deep = false } = req.body;

    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    // Check if Firestore is initialized
    const dbInstance = getDb();
    if (!dbInstance) {
      return res.status(503).json({ error: 'Firestore service unavailable' });
    }

    // For MCP, we allow the request and let underlying auth handle restrictions
    // Fetch the article first
    const doc = await dbInstance.collection('articles').doc(articleId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const articleData = doc.data();
    if (!articleData) {
      return res.status(404).json({ error: 'Article data not found' });
    }

    // Get verification (this will check cache or compute as needed)
    const result = await getVerification(articleData, !!deep);

    res.json(result);
  } catch (error) {
    console.error('Error verifying article via MCP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Search articles as MCP resource collection
 */
export const searchArticlesResource = async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offsetNum = parseInt(offset as string, 10) || 0;

    // Check if Firestore is initialized
    const dbInstance = getDb();
    if (!dbInstance) {
      return res.status(503).json({ error: 'Firestore service unavailable' });
    }

    const articlesRef = dbInstance.collection('articles')
      .orderBy('publishedAt', 'desc')
      .offset(offsetNum)
      .limit(limitNum);

    const snapshot = await articlesRef.get();
    const articles = snapshot.docs.map((doc: DocumentData) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Format as MCP resource collection
    const resource = {
      uri: `prism://articles`,
      name: "PRISM Articles Collection",
      description: "Collection of news articles with credibility scores",
      mimeType: "application/json",
      text: JSON.stringify({
        articles,
        count: articles.length,
        limit: limitNum,
        offset: offsetNum
      }, null, 2)
    };

    res.json(resource);
  } catch (error) {
    console.error('Error searching articles via MCP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get platform statistics as MCP resource
 */
export const getStatsResource = async (_req: Request, res: Response) => {
  try {
    // Check if Firestore is initialized
    const dbInstance = getDb();
    if (!dbInstance) {
      return res.status(503).json({ error: 'Firestore service unavailable' });
    }

    // Get total articles count
    const totalArticlesSnapshot = await dbInstance.collection('articles').count().get();
    const totalArticles = totalArticlesSnapshot.data().count;

    // Get articles from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentArticlesSnapshot = await dbInstance.collection('articles')
      .where('publishedAt', '>=', yesterday)
      .count()
      .get();
    const recentArticles = recentArticlesSnapshot.data().count;

    // Get unique sources count
    const sourcesSnapshot = await dbInstance.collection('articles').get();
    const sources = new Set<string>();
    sourcesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data?.source) {
        sources.add(data.source);
      }
    });
    const uniqueSources = sources.size;

    // Calculate average credibility
    let totalCredibility = 0;
    let articlesWithScore = 0;
    sourcesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data?.sourceCredibility !== undefined) {
        totalCredibility += data.sourceCredibility;
        articlesWithScore++;
      }
    });
    const avgCredibility = articlesWithScore > 0 ? totalCredibility / articlesWithScore : 0;

    // Format as MCP resource
    const resource = {
      uri: `prism://stats`,
      name: "Platform Statistics",
      description: "Usage and content statistics for the PRISM platform",
      mimeType: "application/json",
      text: JSON.stringify({
        totalArticles,
        articlesLast24Hours: recentArticles,
        uniqueSources,
        averageSourceCredibility: parseFloat(avgCredibility.toFixed(3)),
        lastUpdated: new Date().toISOString()
      }, null, 2)
    };

    res.json(resource);
  } catch (error) {
    console.error('Error getting stats resource:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get sources information as MCP resource
 */
export const getSourcesResource = async (_req: Request, res: Response) => {
  try {
    // Check if Firestore is initialized
    const dbInstance = getDb();
    if (!dbInstance) {
      return res.status(503).json({ error: 'Firestore service unavailable' });
    }

    const sourcesSnapshot = await dbInstance.collection('articles').get();
    const sourcesMap = new Map<string, {
      count: number;
      avgCredibility: number;
      lastArticle: string | null;
    }>();

    sourcesSnapshot.forEach(doc => {
      const data = doc.data();
      const source = data?.source || 'Unknown';
      const credibility = data?.sourceCredibility || 0;
      const publishedAt = data?.publishedAt;

      if (!sourcesMap.has(source)) {
        sourcesMap.set(source, {
          count: 0,
          avgCredibility: 0,
          lastArticle: null
        });
      }

      const current = sourcesMap.get(source)!;
      current.count += 1;
      // Update running average
      current.avgCredibility = ((current.avgCredibility * (current.count - 1)) + credibility) / current.count;
      if (publishedAt) {
        const dateStr = typeof publishedAt === 'string' ? publishedAt :
          (publishedAt instanceof Date ? publishedAt.toISOString() :
           (publishedAt._seconds ? new Date(publishedAt._seconds * 1000 + (publishedAt._nanoseconds / 1000000)).toISOString() : null));
        if (!current.lastArticle || (dateStr && dateStr > current.lastArticle)) {
          current.lastArticle = dateStr;
        }
      }
    });

    // Convert to array for JSON serialization
    const sourcesArray = Array.from(sourcesMap.entries()).map(([name, data]) => ({
      name,
      articleCount: data.count,
      averageCredibility: parseFloat(data.avgCredibility.toFixed(3)),
      mostRecentArticle: data.lastArticle
    })).sort((a, b) => b.articleCount - a.articleCount); // Sort by article count descending

    // Format as MCP resource
    const resource = {
      uri: `prism://sources`,
      name: "News Sources Information",
      description: "Statistics and credibility scores for news sources",
      mimeType: "application/json",
      text: JSON.stringify({
        sources: sourcesArray,
        totalSources: sourcesArray.length,
        lastUpdated: new Date().toISOString()
      }, null, 2)
    };

    res.json(resource);
  } catch (error) {
    console.error('Error getting sources resource:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Search articles (MCP tool)
 */
export const searchArticlesTool = async (req: Request, res: Response) => {
  try {
    const {
      query,
      sources = [],
      startDate,
      endDate,
      minCredibility = 0,
      limit = 10,
      offset = 0
    } = req.body;

    // Check if Firestore is initialized
    const dbInstance = getDb();
    if (!dbInstance) {
      return res.status(503).json({ error: 'Firestore service unavailable' });
    }

    let articlesRef = dbInstance.collection('articles').orderBy('publishedAt', 'desc');

    // Apply text search if provided
    if (query && query.trim() !== '') {
      // Note: For full-text search, you'd typically need a search service like Algolia or Elasticsearch
      // For now, we'll do a simple case-insensitive match on title and summary (limited but functional)
      // In a production system, you'd want to implement proper full-text search
      // This is a simplified version that works with Firestore's limitations
      // We'll have to fetch and filter in-memory for true text search
    }

    // Apply source filter
    if (sources.length > 0) {
      // Firestore doesn't support "in" with more than 10 values, so we batch if needed
      // For simplicity, we'll handle up to 10 values here
      if (sources.length <= 10) {
        articlesRef = articlesRef.where('source', 'in', sources);
      } else {
        // For >10 values, we'd need to do multiple queries and merge results
        // For simplicity, we'll take first 10
        articlesRef = articlesRef.where('source', 'in', sources.slice(0, 10));
      }
    }

    // Apply date range filter
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        articlesRef = articlesRef.where('publishedAt', '>=', start);
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        articlesRef = articlesRef.where('publishedAt', '<=', end);
      }
    }

    // Apply credibility filter
    if (minCredibility > 0) {
      articlesRef = articlesRef.where('sourceCredibility', '>=', minCredibility);
    }

    // Apply pagination
    articlesRef = articlesRef.limit(limit).offset(offset);

    const snapshot = await articlesRef.get();
    const articles = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...(typeof data === 'object' && data !== null ? data : {})
      };
    }) as Array<Record<string, any>>;

    // If we had a text query, filter results client-side (since we can't do full-text search in Firestore easily)
    let filteredArticles = articles;
    if (query && query.trim() !== '') {
      const searchTerm = query.toLowerCase().trim();
      filteredArticles = articles.filter(article => {
        const title = (article.title || '').toLowerCase();
        const content = (article.summary || '').toLowerCase();
        return title.includes(searchTerm) || content.includes(searchTerm);
      });
    }

    res.json({
      articles: filteredArticles,
      count: filteredArticles.length,
      totalAvailable: articles.length, // This is approximate if we filtered client-side
      limit,
      offset
    });
  } catch (error) {
    console.error('Error searching articles via MCP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get trending topics (MCP tool)
 */
export const getTrendingTopicsTool = async (_req: Request, res: Response) => {
  try {
    // Get articles from the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const articlesSnapshot = await db.collection('articles')
      .where('publishedAt', '>=', weekAgo)
      .limit(100) // Limit to recent articles for performance
      .get();

    // Simple keyword extraction from titles (in a real app, you'd use NLP)
    const wordFrequency: Record<string, number> = {};
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
      'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
    ]);

    articlesSnapshot.forEach(doc => {
      const data = doc.data();
      const title = data?.title || '';

      // Extract words from title
      const words = title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter((word: string) =>
          word.length > 2 &&
          !stopWords.has(word) &&
          !/^\d+$/.test(word) // Not just numbers
        );

      words.forEach((word: string) => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      });
    });

    // Sort by frequency and take top 10
    const topWords = Object.entries(wordFrequency)
      .sort(([, count1], [, count2]) => count2 - count1)
      .slice(0, 10)
      .map(([word, count]) => ({ term: word, frequency: count }));

    res.json({
      topics: topWords,
      period: 'last 7 days',
      analyzedArticles: articlesSnapshot.size,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting trending topics via MCP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get geographic distribution of articles (MCP tool)
 */
export const getGeographicDistributionTool = async (_req: Request, res: Response) => {
  try {
    // Get articles with location data from the last 30 days
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const articlesSnapshot = await db.collection('articles')
      .where('publishedAt', '>=', monthAgo)
      .where('latitude', '!=', null)
      .where('longitude', '!=', null)
      .limit(500) // Reasonable limit for performance
      .get();

    // Group by approximate location (rounded to 1 degree for clustering)
    const locationCounts: Record<string, { count: number; latitude: number; longitude: number; articles: string[] }> = {};

    articlesSnapshot.forEach(doc => {
      const data = doc.data();
      const lat = data?.latitude;
      const lng = data?.longitude;

      if (typeof lat === 'number' && typeof lng === 'number') {
        // Round to approximately 1 degree (~111km) for clustering
        const latKey = Math.round(lat * 10) / 10;
        const lngKey = Math.round(lng * 10) / 10;
        const key = `${latKey},${lngKey}`;

        if (!locationCounts[key]) {
          locationCounts[key] = { count: 0, latitude: latKey, longitude: lngKey, articles: [] };
        }

        const location = locationCounts[key];
        location.count += 1;
        location.articles.push(doc.id);
      }
    });

    // Convert to array and sort by count
    const locations = Object.values(locationCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 locations

    res.json({
      locations: locations.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        articleCount: loc.count,
        sampleArticleIds: loc.articles.slice(0, 3) // Show up to 3 sample IDs
      })),
      period: 'last 30 days',
      totalLocatedArticles: articlesSnapshot.size,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting geographic distribution via MCP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Analyze sentiment of articles (MCP tool)
 */
export const analyzeSentimentTool = async (req: Request, res: Response) => {
  try {
    const { articleId, analyzeTitle = true, analyzeSummary = true, analyzeContent = false } = req.body;

    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    // Fetch the article
    const doc = await db.collection('articles').doc(articleId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const articleData = doc.data();
    if (!articleData) {
      return res.status(404).json({ error: 'Article data not found' });
    }

    // Extract text to analyze based on parameters
    const textParts = [];
    if (analyzeTitle && articleData.title) {
      textParts.push(articleData.title);
    }
    if (analyzeSummary && articleData.summary) {
      textParts.push(articleData.summary);
    }
    if (analyzeContent && articleData.content) {
      textParts.push(articleData.content);
    }

    const textToAnalyze = textParts.join(' ');

    if (!textToAnalyze.trim()) {
      return res.status(400).json({ error: 'No text available for sentiment analysis' });
    }

    // Perform sentiment analysis
    const sentiment = analyzeSentiment(textToAnalyze);

    // Get sentiment label based on score
    let label = 'neutral';
    if (sentiment.score > 0.1) {
      label = 'positive';
    } else if (sentiment.score < -0.1) {
      label = 'negative';
    }

    res.json({
      articleId,
      textAnalyzed: textToAnalyze.substring(0, 200) + (textToAnalyze.length > 200 ? '...' : ''),
      sentiment: {
        score: sentiment.score,
        comparative: sentiment.comparative,
        label,
        positive: sentiment.positive,
        negative: sentiment.negative,
        neutral: sentiment.neutral
      },
      analyzedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing sentiment via MCP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Cluster articles by topic similarity (MCP tool)
 */
export const clusterTopicsTool = async (req: Request, res: Response) => {
  try {
    const { numClusters = 5, timeframe = 'week', limit = 50, minSimilarity = 0.3 } = req.body;

    // Calculate date based on timeframe
    let dateOffset: number;
    switch (timeframe) {
      case 'hour':
        dateOffset = 1 * 60 * 60 * 1000;
        break;
      case 'day':
        dateOffset = 24 * 60 * 60 * 1000;
        break;
      case 'week':
        dateOffset = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        dateOffset = 30 * 24 * 60 * 60 * 1000; // Approximate
        break;
      default:
        dateOffset = 7 * 24 * 60 * 60 * 1000; // Default to week
    }

    const since = new Date(Date.now() - dateOffset);

    // Get articles from the specified timeframe
    const articlesSnapshot = await db.collection('articles')
      .where('publishedAt', '>=', since)
      .orderBy('publishedAt', 'desc')
      .limit(limit)
      .get();

    if (articlesSnapshot.empty) {
      return res.json({
        clusters: [],
        message: 'No articles found for the specified timeframe',
        parameters: { numClusters, timeframe, limit, minSimilarity },
        analyzedAt: new Date().toISOString()
      });
    }

    // Extract articles data
    const articles = articlesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    }));

    // Prepare text for analysis (title + summary)
    const articleTexts = articles.map(article => {
      const title = article.title || '';
      const summary = article.summary || '';
      return `${title} ${summary}`.trim();
    }).filter(text => text.length > 10); // Only keep articles with substantial text

    if (articleTexts.length === 0) {
      return res.json({
        clusters: [],
        message: 'No articles with sufficient text content found',
        parameters: { numClusters, timeframe, limit, minSimilarity },
        analyzedAt: new Date().toISOString()
      });
    }

    try {
      // Process all texts with compromise
      const processedDocs = articleTexts.map(text => nlp(text));

      // Extract noun phrases as features for clustering
      const allTerms: string[] = [];
      const docTerms: string[][] = [];

      processedDocs.forEach((doc, index) => {
        const terms = [];
        // Get noun phrases
        const nounPhrases = doc.nounPhrases().out('array');
        // Get notable people, places, organizations
        const people = doc.people().out('array');
        const places = doc.places().out('array');
        const organizations = doc.organizations().out('array');

        // Combine all meaningful terms
        const allEntities = [...nounPhrases, ...people, ...places, ...organizations];

        // Filter and clean terms
        const filtered = allEntities
          .filter((term: string) => {
            if (typeof term !== 'string' || term.length < 3) return false;
            const lowerTerm = term.toLowerCase();
            // Basic stopwords
            const stopWords = new Set([
              'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
              'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
              'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
              'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
              'those', 'said', 'says', 'according', 'report', 'reports', 'reporting'
            ]);
            return !stopWords.has(lowerTerm) && !/^\d+$/.test(term);
          })
          .map((term: string) => term.trim().toLowerCase());

        docTerms.push(filtered);
        allTerms.push(...filtered);
      });

      // Get unique terms and their document frequencies
      const termFreq: Record<string, number> = {};
      allTerms.forEach(term => {
        termFreq[term] = (termFreq[term] || 0) + 1;
      });

      // Filter terms that appear in multiple documents (to reduce noise)
      const significantTerms = Object.keys(termFreq).filter(term => termFreq[term] >= 2);

      // If we don't have enough terms, fall back to simpler approach
      if (significantTerms.length < 3) {
        return res.json({
          clusters: [],
          message: 'Insufficient meaningful terms for clustering',
          parameters: { numClusters, timeframe, limit, minSimilarity },
          analyzedAt: new Date().toISOString()
        });
      }

      // Create term-document matrix (simplified TF-IDF)
      const tfidfMatrix: number[][] = [];
      docTerms.forEach(docTerms => {
        const tfidfRow: number[] = [];
        significantTerms.forEach(term => {
          const tf = docTerms.filter(t => t === term).length / Math.max(1, docTerms.length);
          const idf = Math.log(articleTexts.length / (termFreq[term] || 1));
          tfidfRow.push(tf * idf);
        });
        tfidfMatrix.push(tfidfRow);
      });

      // Simple clustering: assign each document to the cluster of its most similar centroid
      // Initialize centroids randomly
      const centroids: number[][] = [];
      for (let i = 0; i < Math.min(numClusters, significantTerms.length); i++) {
        const centroid: number[] = [];
        for (let j = 0; j < significantTerms.length; j++) {
          // Random value between 0 and 1
          centroid.push(Math.random());
        }
        centroids.push(centroid);
      }

      // Assign documents to clusters (simplified k-means)
      const clusterAssignments: number[] = [];
      docTerms.forEach((_, docIndex) => {
        let maxSimilarity = -1;
        let bestCluster = 0;

        for (let c = 0; c < centroids.length; c++) {
          // Calculate cosine similarity
          let dotProduct = 0;
          let magnitudeA = 0;
          let magnitudeB = 0;

          for (let t = 0; t < significantTerms.length; t++) {
            dotProduct += tfidfMatrix[docIndex][t] * centroids[c][t];
            magnitudeA += tfidfMatrix[docIndex][t] * tfidfMatrix[docIndex][t];
            magnitudeB += centroids[c][t] * centroids[c][t];
          }

          const similarity = magnitudeA > 0 && magnitudeB > 0 ? dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB)) : 0;

          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestCluster = c;
          }
        }

        clusterAssignments.push(bestCluster);
      });

      // Group documents by cluster
      const clusters: Array<{
        id: number;
        articles: Array<{
          id: string;
          title: string;
          summary: string;
          source: string;
          publishedAt: string | Date;
        }>;
        keywords: string[];
        centroidSimilarity: number;
      }> = [];

      for (let c = 0; c < numClusters; c++) {
        const clusterArticles: typeof clusters[0]['articles'] = [];
        clusterAssignments.forEach((assignedCluster, docIndex) => {
          if (assignedCluster === c) {
            const article = articles[docIndex];
            clusterArticles.push({
              id: article.id,
              title: article.title || '',
              summary: article.summary || '',
              source: article.source || '',
              publishedAt: article.publishedAt || new Date()
            });
          }
        });

        // Extract top keywords for this cluster
        const clusterTerms: Record<string, number> = {};
        clusterArticles.forEach((article, index) => {
          const docIndex = clusterAssignments.findIndex((assigned, i) => assigned === c && i === index);
          if (docIndex !== -1) {
            docTerms[docIndex].forEach(term => {
              clusterTerms[term] = (clusterTerms[term] || 0) + 1;
            });
          }
        });

        const topKeywords = Object.entries(clusterTerms)
          .sort(([, count1], [, count2]) => count2 - count1)
          .slice(0, 10)
          .map(([term]) => term);

        clusters.push({
          id: c,
          articles: clusterArticles,
          keywords: topKeywords,
          centroidSimilarity: clusterArticles.length > 0 ? 0.8 : 0 // Placeholder value
        });
      }

      // Filter out empty clusters
      const nonEmptyClusters = clusters.filter(cluster => cluster.articles.length > 0);

      res.json({
        clusters: nonEmptyClusters,
        parameters: { numClusters, timeframe, limit, minSimilarity },
        totalArticlesAnalyzed: articles.length,
        articlesWithSufficientText: articleTexts.length,
        analyzedAt: new Date().toISOString()
      });
    } catch (nlpError) {
      console.error('Error in NLP processing for clustering:', nlpError);
      // Fallback to simpler keyword-based clustering

      // Simple keyword extraction and clustering
      const wordFrequency: Record<string, number> = {};
      const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
        'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
        'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
        'said', 'says', 'according', 'report', 'reports', 'reporting'
      ]);

      articles.forEach(article => {
        const text = `${article.title || ''} ${article.summary || ''}`.toLowerCase();
        const words = text
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word =>
            word.length > 2 &&
            !stopWords.has(word) &&
            !/^\d+$/.test(word)
          );

        words.forEach(word => {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        });
      });

      // Get top words as cluster topics
      const topWords = Object.entries(wordFrequency)
        .sort(([, count1], [, count2]) => count2 - count1)
        .slice(0, numClusters * 3) // Get more words than needed for distribution
        .map(([word]) => word);

      // Distribute articles among clusters based on keyword matches
      const clusters: Array<{
        id: number;
        articles: Array<{
          id: string;
          title: string;
          summary: string;
          source: string;
          publishedAt: string | Date;
        }>;
        keywords: string[];
      }> = [];

      for (let i = 0; i < Math.min(numClusters, topWords.length); i++) {
        const keyword = topWords[i];
        const clusterArticles = articles.filter(article => {
          const text = `${article.title || ''} ${article.summary || ''}`.toLowerCase();
          return text.includes(keyword);
        });

        if (clusterArticles.length > 0) {
          clusters.push({
            id: i,
            articles: clusterArticles.map(article => ({
              id: article.id,
              title: article.title || '',
              summary: article.summary || '',
              source: article.source || '',
              publishedAt: article.publishedAt || new Date()
            })),
            keywords: [keyword] // Simplified - in reality would have more keywords per cluster
          });
        }
      }

      res.json({
        clusters,
        parameters: { numClusters, timeframe, limit, minSimilarity },
        totalArticlesAnalyzed: articles.length,
        note: 'Used simplified clustering due to NLP processing error',
        analyzedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error clustering topics via MCP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getMCPCapabilities,
  getArticleResource,
  verifyArticleTool,
  searchArticlesResource,
  getStatsResource,
  getSourcesResource,
  searchArticlesTool,
  getTrendingTopicsTool,
  getGeographicDistributionTool,
  analyzeSentimentTool,
  clusterTopicsTool
};