declare var process: {
  env: {
    [key: string]: string | undefined;
  };
};
declare var Buffer: {
  from(str: string): {
    toString(encoding: string): string;
  };
};

import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Cache configuration
export const CACHE_CONFIG = {
  TTL: {
    PROPERTIES_LIST: 300, // 5 minutes
    SINGLE_PROPERTY: 600, // 10 minutes
    USER_PROPERTIES: 180, // 3 minutes
  },
  KEYS: {
    PROPERTIES_LIST: 'properties:list',
    SINGLE_PROPERTY: (id: string) => `property:${id}`,
    USER_PROPERTIES: (userId: string) => `user:${userId}:properties`,
    PROPERTIES_COUNT: 'properties:count',
  }
};

// Helper function to generate cache key for filtered queries
export const generateCacheKey = (baseKey: string, filters: any): string => {
  const filterString = Object.keys(filters)
    .sort()
    .map(key => `${key}:${filters[key]}`)
    .join('|');
  
  return filterString ? `${baseKey}:${Buffer.from(filterString).toString('base64')}` : baseKey;
};