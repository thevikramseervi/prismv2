import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

@Injectable()
export class RateLimiterService {
  private readonly attempts = new Map<string, RateLimitEntry>();

  /**
   * Simple in-memory rate limiter.
   * Throws HttpException when the given key exceeds the allowed attempts
   * within the configured window.
   */
  checkLimit(key: string, limit: number, windowMs: number, message: string) {
    const now = Date.now();
    const entry = this.attempts.get(key);

    if (entry) {
      if (now - entry.windowStart > windowMs) {
        this.attempts.set(key, { count: 1, windowStart: now });
      } else if (entry.count >= limit) {
        throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
      } else {
        entry.count += 1;
      }
    } else {
      this.attempts.set(key, { count: 1, windowStart: now });
    }
  }
}

