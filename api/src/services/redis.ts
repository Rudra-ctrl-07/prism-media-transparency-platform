import { Redis } from '@upstash/redis';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) {
    console.warn('Failed to initialize Upstash Redis:', e);
  }
}

export default redis;