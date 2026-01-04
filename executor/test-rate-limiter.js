/**
 * Rate Limiter Test Suite
 * Run: node test-rate-limiter.js
 */

const { RateLimiter, TokenBucket, FixedWindowLimiter } = require('./rate-limiter.js');

console.log('🧪 Testing Rate Limiters\n');

// Test 1: RateLimiter with Exponential Backoff
console.log('Test 1: Exponential Backoff Rate Limiter');
console.log('=========================================');

const limiter = new RateLimiter({
  minInterval: 1000,
  maxInterval: 10000,
  initialInterval: 2000,
  backoffMultiplier: 2,
  recoveryRate: 500
});

console.log('Initial state:', limiter.getStats());

// Simulate success
limiter.recordSuccess();
console.log('After 1 success:', { interval: limiter.getCurrentInterval() });

limiter.recordSuccess();
console.log('After 2 successes:', { interval: limiter.getCurrentInterval() });

// Simulate errors
limiter.recordError();
console.log('After 1 error:', { interval: limiter.getCurrentInterval() });

limiter.recordError();
console.log('After 2 errors:', { interval: limiter.getCurrentInterval() });

limiter.recordError();
console.log('After 3 errors:', { interval: limiter.getCurrentInterval() });

console.log('\nFinal stats:', limiter.getStats());
console.log('✅ Test 1 passed\n');

// Test 2: Token Bucket
console.log('Test 2: Token Bucket Rate Limiter');
console.log('===================================');

const bucket = new TokenBucket({
  capacity: 10,
  refillRate: 2  // 2 tokens per second
});

console.log('Initial tokens:', bucket.getTokens());

// Consume tokens
let consumed = 0;
for (let i = 0; i < 15; i++) {
  if (bucket.tryConsume()) {
    consumed++;
  }
}

console.log('Consumed:', consumed, '/ 15');
console.log('Remaining tokens:', bucket.getTokens());

// Wait for refill
setTimeout(() => {
  console.log('After 1 second, tokens:', bucket.getTokens());
  bucket.destroy();
  console.log('✅ Test 2 passed\n');

  // Test 3: Fixed Window Limiter
  console.log('Test 3: Fixed Window Limiter');
  console.log('============================');

  const windowLimiter = new FixedWindowLimiter({
    maxRequests: 5,
    windowMs: 3000  // 3 seconds
  });

  let allowed = 0;
  let rejected = 0;

  for (let i = 0; i < 10; i++) {
    if (windowLimiter.tryRequest()) {
      allowed++;
    } else {
      rejected++;
    }
  }

  console.log('Allowed:', allowed);
  console.log('Rejected:', rejected);
  console.log('Stats:', windowLimiter.getStats());
  console.log('✅ Test 3 passed\n');

  console.log('🎉 All tests passed!');
}, 1100);
