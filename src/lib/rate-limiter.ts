interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockUntil?: number;
}

class RateLimiter {
  private store: Map<string, RateLimitInfo> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  configure(name: string, config: RateLimitConfig): void {
    this.configs.set(name, { ...config, keyPrefix: config.keyPrefix ?? 'rl' });
  }

  async checkLimit(
    identifier: string,
    configName: string = 'default'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number; retryAfter?: number }> {
    const config = this.configs.get(configName) ?? { maxRequests: 100, windowMs: 60000, keyPrefix: 'rl' };
    const key = `${config.keyPrefix}:${identifier}`;
    const now = Date.now();
    let info = this.store.get(key);

    if (!info || info.resetTime <= now) {
      info = { count: 0, resetTime: now + config.windowMs };
      this.store.set(key, info);
    }

    if (info.blocked && info.blockUntil && info.blockUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: info.blockUntil,
        retryAfter: Math.ceil((info.blockUntil - now) / 1000),
      };
    }

    info.count++;

    if (info.count > config.maxRequests) {
      info.blocked = true;
      info.blockUntil = now + config.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetTime: info.blockUntil,
        retryAfter: Math.ceil(config.windowMs / 1000),
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - info.count,
      resetTime: info.resetTime,
    };
  }

  async consume(identifier: string, configName: string = 'default', _cost: number = 1): Promise<boolean> {
    const result = await this.checkLimit(identifier, configName);
    return result.allowed;
  }

  reset(identifier: string, configName: string = 'default'): void {
    const config = this.configs.get(configName) ?? { keyPrefix: 'rl' };
    this.store.delete(`${config.keyPrefix}:${identifier}`);
  }

  resetAll(): void {
    this.store.clear();
  }

  getStats(identifier: string, configName: string = 'default'): RateLimitInfo | undefined {
    const config = this.configs.get(configName) ?? { keyPrefix: 'rl' };
    return this.store.get(`${config.keyPrefix}:${identifier}`);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, info] of this.store.entries()) {
        if (info.resetTime < now && (!info.blockUntil || info.blockUntil < now)) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
    this.configs.clear();
  }
}

export const rateLimiter = new RateLimiter();

rateLimiter.configure('auth', { maxRequests: 10, windowMs: 60000, keyPrefix: 'auth' });
rateLimiter.configure('sync', { maxRequests: 30, windowMs: 60000, keyPrefix: 'sync' });
rateLimiter.configure('storage', { maxRequests: 100, windowMs: 60000, keyPrefix: 'storage' });
rateLimiter.configure('migration', { maxRequests: 5, windowMs: 3600000, keyPrefix: 'migration' });
rateLimiter.configure('api', { maxRequests: 200, windowMs: 60000, keyPrefix: 'api' });
rateLimiter.configure('default', { maxRequests: 60, windowMs: 60000, keyPrefix: 'default' });

export function getClientIdentifier(): string {
  let id = localStorage.getItem('finance-pal-client-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('finance-pal-client-id', id);
  }
  return id;
}

export async function withRateLimit<T>(
  operation: () => Promise<T>,
  configName: string = 'default',
  identifier?: string
): Promise<T> {
  const id = identifier ?? getClientIdentifier();
  const allowed = await rateLimiter.consume(id, configName);
  
  if (!allowed) {
    const stats = rateLimiter.getStats(id, configName);
    const retryAfter = stats?.blockUntil 
      ? Math.ceil((stats.blockUntil - Date.now()) / 1000)
      : 60;
    throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`);
  }
  
  return operation();
}

export function createRateLimitedFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  configName: string = 'default',
  getIdentifier?: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const identifier = getIdentifier ? getIdentifier(...args) : getClientIdentifier();
    return withRateLimit(() => fn(...args), configName, identifier);
  }) as T;
}