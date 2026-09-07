/**
 * notifications.ts — browser notification helper for watch-alert matches.
 *
 * Requests permission on first use, then sends desktop notifications when
 * articles match a user's watch queries. Notifications are throttled to
 * avoid spamming — at most one per unique article+query pair.
 */

import { Article } from '../types';

interface UserAlert {
  id: string;
  query: string;
  source: string;
  createdAt: string;
}

/** Track which article+alert pairs we've already notified about. */
const notified = new Set<string>();

/**
 * Request browser notification permission (idempotent).
 * Returns true if permission was granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Check if any new articles match a user's watch alerts and send
 * browser notifications for unseen matches. Returns the count of
 * new notifications sent.
 */
export function checkAndNotify(
  articles: Article[],
  alerts: UserAlert[],
): number {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return 0;
  }

  let notifiedCount = 0;

  for (const article of articles) {
    for (const alert of alerts) {
      const q = alert.query.trim().toLowerCase();
      if (!q) continue;
      if (alert.source !== 'all' && article.sourceName !== alert.source) continue;

      const hay = `${article.title} ${article.excerpt} ${article.sourceName}`.toLowerCase();
      if (!hay.includes(q)) continue;

      const key = `${article.id}:${alert.id}`;
      if (notified.has(key)) continue;
      notified.add(key);

      try {
        new Notification('PRISM Watch Alert', {
          body: `"${alert.query}" matched: ${article.title}`,
          icon: '/favicon.ico',
          tag: key, // prevents duplicate OS notifications
        });
        notifiedCount++;
      } catch {
        // Notification constructor can throw in some environments
      }
    }
  }

  return notifiedCount;
}

/**
 * Clear the dedup set (e.g., on logout or reset).
 */
export function clearNotificationCache(): void {
  notified.clear();
}
