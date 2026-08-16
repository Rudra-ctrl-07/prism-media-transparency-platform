import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firestore
function getDb() {
  try {
    return getFirestore();
  } catch (e) {
    return null;
  }
}

/**
 * Track an article view (impression)
 */
export const trackArticleView = async (
  articleId: string,
  options: {
    userId?: string | null;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  } = {}
) => {
  try {
    const db = getDb();
    if (!db) {
      console.warn('Firestore not available, skipping analytics tracking');
      return;
    }

    const viewData = {
      articleId,
      userId: options.userId ?? null,
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
      referrer: options.referrer ?? null,
      timestamp: FieldValue.serverTimestamp(),
      type: 'view'
    };

    await db.collection('analytics').add(viewData);
  } catch (error) {
    console.error('Error tracking article view:', error);
  }
};

/**
 * Track an article engagement (click, share, etc.)
 */
export const trackArticleEngagement = async (
  articleId: string,
  engagementType: string,
  userId?: string,
  value?: number
) => {
  try {
    const db = getDb();
    if (!db) {
      console.warn('Firestore not available, skipping engagement tracking');
      return;
    }

    const engagementData = {
      articleId,
      userId: userId ?? null,
      type: engagementType,
      value: value ?? 1,
      timestamp: FieldValue.serverTimestamp()
    };

    await db.collection('analytics').add(engagementData);
  } catch (error) {
    console.error('Error tracking article engagement:', error);
  }
};

/**
 * Get analytics for an article
 */
export const getArticleAnalytics = async (articleId: string, days: number = 30) => {
  try {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore not available');
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analyticsSnapshot = await db.collection('analytics')
      .where('articleId', '==', articleId)
      .where('timestamp', '>=', startDate)
      .get();

    const views = analyticsSnapshot.docs
      .filter(doc => doc.data().type === 'view')
      .length;

    const engagements = analyticsSnapshot.docs
      .filter(doc => doc.data().type !== 'view')
      .length;

    // Get unique users
    const userIds = new Set<string>();
    analyticsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.userId) {
        userIds.add(data.userId);
      }
    });

    return {
      articleId,
      periodDays: days,
      views,
      engagements,
      uniqueUsers: userIds.size,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting article analytics:', error);
    throw error;
  }
};

/**
 * Get top articles by views
 */
export const getTopArticlesByViews = async (limit: number = 10, days: number = 30) => {
  try {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore not available');
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get all analytics records in the date range
    const analyticsSnapshot = await db.collection('analytics')
      .where('timestamp', '>=', startDate)
      .where('type', '==', 'view')
      .get();

    // Count views per article
    const viewCounts: Record<string, number> = {};
    analyticsSnapshot.forEach(doc => {
      const data = doc.data();
      const articleId = data.articleId;
      if (articleId) {
        viewCounts[articleId] = (viewCounts[articleId] || 0) + 1;
      }
    });

    // Sort by view count and take top N
    const sortedArticles = Object.entries(viewCounts)
      .sort(([, count1], [, count2]) => count2 - count1)
      .slice(0, limit)
      .map(([articleId, count]) => ({
        articleId,
        viewCount: count
      }));

    return {
      periodDays: days,
      articles: sortedArticles,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting top articles by views:', error);
    throw error;
  }
};