import Result, { type AnyResult } from '../result';

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheError {
  reason: string;
  source?: 'cache' | 'origin';
  retriable: boolean;
}

// Cache service with fallback to data source
class CacheService<T> {
  private cache: Map<string, CachedData<T>> = new Map();
  private ttlMs: number;
  private dataFetcher: (key: string) => Promise<T>;
  
  constructor(
    ttlMs: number = 60000, // Default TTL: 1 minute
    dataFetcher: (key: string) => Promise<T>
  ) {
    this.ttlMs = ttlMs;
    this.dataFetcher = dataFetcher;
  }
  
  // Get data with cache-first strategy
  async get(key: string): Promise<AnyResult<T, CacheError>> {
    // Try to get from cache first
    const cachedResult = this.getFromCache(key);
    
    if (Result.isOk(cachedResult)) {
      return cachedResult;
    }
    
    // Cache miss or expired, get from source
    return await this.getFromSource(key);
  }
  
  // Get with stale-while-revalidate strategy
  async getWithStaleWhileRevalidate(key: string): Promise<AnyResult<T, CacheError>> {
    const cachedData = this.cache.get(key);
    
    // If we have data (even if expired), use it and refresh in background
    if (cachedData) {
      // Check if expired
      if (Date.now() > cachedData.expiresAt) {
        // Data is stale but still usable, refresh in background
        this.getFromSource(key).then(result => {
          if (Result.isOk(result)) {
            console.log(`Background refresh completed for ${key}`);
          } else {
            console.error(`Background refresh failed for ${key}:`, result.error);
          }
        });
        
        console.log(`Returning stale data for ${key} while refreshing`);
      }
      
      return Result.ok(cachedData.data);
    }
    
    // No cached data available, get from source
    return this.getFromSource(key);
  }
  
  // Circuit breaker pattern for unstable sources
  private failureCount: Map<string, number> = new Map();
  private breakerOpenUntil: Map<string, number> = new Map();
  
  async getWithCircuitBreaker(key: string): Promise<AnyResult<T, CacheError>> {
    // Check if circuit breaker is open
    const breakerOpenUntilTimestamp = this.breakerOpenUntil.get(key) || 0;
    if (Date.now() < breakerOpenUntilTimestamp) {
      // Circuit is open, try to get from cache regardless of freshness
      const cachedData = this.cache.get(key);
      if (cachedData) {
        return Result.ok(cachedData.data);
      }
      
      return Result.not({
        reason: 'Circuit breaker open and no cached data available',
        source: 'cache',
        retriable: false
      });
    }
    
    // Try to get fresh data 
    const result = await this.getFromSource(key);
    
    if (Result.notOk(result)) {
      // Increment failure count
      const failures = (this.failureCount.get(key) || 0) + 1;
      this.failureCount.set(key, failures);
      
      // If threshold reached, open circuit breaker
      if (failures >= 3) {
        const openUntil = Date.now() + 30000; // Open for 30 seconds
        this.breakerOpenUntil.set(key, openUntil);
        console.log(`Circuit breaker opened for ${key} until ${new Date(openUntil).toISOString()}`);
        
        // Try to return stale data as fallback
        const cachedData = this.cache.get(key);
        if (cachedData) {
          return Result.ok(cachedData.data);
        }
      }
      
      return result;
    } else {
      // Success, reset failure count
      this.failureCount.delete(key);
      return result;
    }
  }
  
  // Helper to get from cache
  private getFromCache(key: string): AnyResult<T, CacheError> {
    const cachedData = this.cache.get(key);
    
    if (!cachedData) {
      return Result.not({
        reason: 'Cache miss',
        source: 'cache',
        retriable: true
      });
    }
    
    // Check if expired
    if (Date.now() > cachedData.expiresAt) {
      return Result.not({
        reason: 'Cache expired',
        source: 'cache',
        retriable: true
      });
    }
    
    return Result.ok(cachedData.data);
  }
  
  // Helper to get from source and update cache
  private async getFromSource(key: string): Promise<AnyResult<T, CacheError>> {
    try {
      const data = await this.dataFetcher(key);
      
      // Update cache
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.ttlMs
      });
      
      return Result.ok(data);
    } catch (error) {
      return Result.not({
        reason: error instanceof Error ? error.message : 'Unknown error fetching data',
        source: 'origin',
        retriable: true
      });
    }
  }
  
  // Manual cache operations
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  invalidateAll(): void {
    this.cache.clear();
  }
}

// Example usage
async function main() {
  // Create a simulated API with occasional failures
  let failNextFetch = false;
  
  const fetchUser = async (userId: string): Promise<{ id: string, name: string }> => {
    console.log(`Fetching user ${userId} from API...`);
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 300));
    
    // Simulate occasional failures
    if (failNextFetch) {
      failNextFetch = false;
      throw new Error('Network error');
    }
    
    // Simulate user data
    return {
      id: userId,
      name: userId === '1' ? 'Alice' : 'Bob'
    };
  };
  
  // Create cache service
  const userCache = new CacheService(
    5000, // 5 second TTL for testing
    fetchUser
  );
  
  // First fetch (cache miss)
  console.log('First fetch (cache miss):');
  const result1 = await userCache.get('1');
  console.log('Result:', Result.isOk(result1) ? result1.data : result1.error);
  
  // Second fetch (cache hit)
  console.log('\nSecond fetch (cache hit):');
  const result2 = await userCache.get('1');
  console.log('Result:', Result.isOk(result2) ? result2.data : result2.error);
  
  // Simulate failure
  console.log('\nSimulating API failure:');
  failNextFetch = true;
  const result3 = await userCache.get('2');
  console.log('Result:', Result.isOk(result3) ? result3.data : result3.error);
  
  // Demonstrate stale-while-revalidate
  console.log('\nTesting stale-while-revalidate:');
  await userCache.get('3'); // Cache it first
  
  // Wait for cache to expire
  console.log('Waiting for cache to expire...');
  await new Promise(r => setTimeout(r, 6000));
  
  console.log('Getting potentially stale data:');
  const staleResult = await userCache.getWithStaleWhileRevalidate('3');
  console.log('Result:', Result.isOk(staleResult) ? staleResult.data : staleResult.error);
  
  // Circuit breaker example
  console.log('\nCircuit breaker test:');
  
  // Simulate multiple failures to open the breaker
  failNextFetch = true;
  console.log('First failure:');
  await userCache.getWithCircuitBreaker('4');
  
  failNextFetch = true;
  console.log('Second failure:');
  await userCache.getWithCircuitBreaker('4');
  
  failNextFetch = true;
  console.log('Third failure (should open circuit):');
  await userCache.getWithCircuitBreaker('4');
  
  console.log('Fourth request (circuit should be open):');
  const breakerResult = await userCache.getWithCircuitBreaker('4');
  console.log('Result:', Result.isOk(breakerResult) 
    ? 'Success (using stale data)' 
    : breakerResult.error.reason);
}

main().catch(console.error);
