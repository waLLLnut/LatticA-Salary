/**
 * Rate Limiter with Exponential Backoff
 * Prevents DoS attacks and manages API request frequency
 */

class RateLimiter {
  constructor(options = {}) {
    // Configuration
    this.minInterval = options.minInterval || 1000;  // 1 second
    this.maxInterval = options.maxInterval || 60000;  // 60 seconds
    this.initialInterval = options.initialInterval || 5000;  // 5 seconds
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.recoveryRate = options.recoveryRate || 1000;  // 1 second per success

    // State
    this.currentInterval = this.initialInterval;
    this.consecutiveErrors = 0;
    this.consecutiveSuccesses = 0;
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.lastRequestTime = 0;

    // Statistics
    this.startTime = Date.now();
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    this.totalRequests++;
    this.consecutiveSuccesses++;
    this.consecutiveErrors = 0;
    this.lastRequestTime = Date.now();

    // Gradually decrease interval (speed up) on success
    this.currentInterval = Math.max(
      this.minInterval,
      this.currentInterval - this.recoveryRate
    );
  }

  /**
   * Record a failed request
   */
  recordError() {
    this.totalRequests++;
    this.totalErrors++;
    this.consecutiveErrors++;
    this.consecutiveSuccesses = 0;
    this.lastRequestTime = Date.now();

    // Exponential backoff on error
    this.currentInterval = Math.min(
      this.maxInterval,
      this.currentInterval * this.backoffMultiplier
    );
  }

  /**
   * Get current interval to wait before next request
   */
  getCurrentInterval() {
    return this.currentInterval;
  }

  /**
   * Get statistics
   */
  getStats() {
    const uptimeMs = Date.now() - this.startTime;
    const uptimeSec = Math.floor(uptimeMs / 1000);
    const errorRate = this.totalRequests > 0
      ? (this.totalErrors / this.totalRequests * 100).toFixed(2)
      : 0;

    return {
      currentInterval: this.currentInterval,
      consecutiveErrors: this.consecutiveErrors,
      consecutiveSuccesses: this.consecutiveSuccesses,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      errorRate: `${errorRate}%`,
      uptimeSeconds: uptimeSec,
      requestsPerMinute: uptimeSec > 0
        ? (this.totalRequests / (uptimeSec / 60)).toFixed(2)
        : 0
    };
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.currentInterval = this.initialInterval;
    this.consecutiveErrors = 0;
    this.consecutiveSuccesses = 0;
  }

  /**
   * Check if should retry based on consecutive errors
   */
  shouldRetry(maxConsecutiveErrors = 10) {
    return this.consecutiveErrors < maxConsecutiveErrors;
  }
}

/**
 * Token Bucket Rate Limiter
 * Fixed rate with burst capacity
 */
class TokenBucket {
  constructor(options = {}) {
    this.capacity = options.capacity || 100;  // Max tokens
    this.refillRate = options.refillRate || 10;  // Tokens per second
    this.tokens = this.capacity;

    // Auto-refill
    this.refillInterval = setInterval(() => {
      this.tokens = Math.min(
        this.capacity,
        this.tokens + this.refillRate
      );
    }, 1000);
  }

  /**
   * Try to consume a token
   * @returns {boolean} Whether token was consumed
   */
  tryConsume(cost = 1) {
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  /**
   * Get current token count
   */
  getTokens() {
    return this.tokens;
  }

  /**
   * Get time until next token available (ms)
   */
  getTimeUntilToken() {
    if (this.tokens > 0) return 0;
    return Math.ceil((1 - (this.tokens % 1)) * (1000 / this.refillRate));
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.refillInterval) {
      clearInterval(this.refillInterval);
    }
  }
}

/**
 * Fixed Window Rate Limiter
 * Simple count-based limiting per time window
 */
class FixedWindowLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 60000;  // 1 minute
    this.requestCount = 0;
    this.windowStart = Date.now();
  }

  /**
   * Try to make a request
   * @returns {boolean} Whether request is allowed
   */
  tryRequest() {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart >= this.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Check limit
    if (this.requestCount < this.maxRequests) {
      this.requestCount++;
      return true;
    }

    return false;
  }

  /**
   * Get time until window resets (ms)
   */
  getTimeUntilReset() {
    return Math.max(0, this.windowMs - (Date.now() - this.windowStart));
  }

  /**
   * Get remaining requests in current window
   */
  getRemainingRequests() {
    return Math.max(0, this.maxRequests - this.requestCount);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      maxRequests: this.maxRequests,
      remainingRequests: this.getRemainingRequests(),
      timeUntilReset: this.getTimeUntilReset(),
      windowMs: this.windowMs
    };
  }
}

module.exports = {
  RateLimiter,
  TokenBucket,
  FixedWindowLimiter
};
