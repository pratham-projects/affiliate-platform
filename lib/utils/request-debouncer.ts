// Request debouncer to prevent excessive API calls
class RequestDebouncer {
  private timers = new Map<string, NodeJS.Timeout>();
  private _cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  // Debounce a function call
  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = 300
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
      }

      // Set new timer
      const timer = setTimeout(() => {
        fn(...args);
        this.timers.delete(key);
      }, delay);

      this.timers.set(key, timer);
    };
  }

  // Cache a request result
  cache<T>(key: string, data: T): void {
    this._cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Get cached result if still valid
  getCached<T>(key: string): T | null {
    const cached = this._cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this._cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  // Clear all timers and cache
  clear(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this._cache.clear();
  }

  // Clear specific key
  clearKey(key: string): void {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
    this._cache.delete(key);
  }
}

// Global instance
export const requestDebouncer = new RequestDebouncer();

// Hook for React components
export function useRequestDebouncer() {
  return requestDebouncer;
}