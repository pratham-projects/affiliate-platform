import { API_BASE_URL, ApiResponse, ApiError, TOKEN_ERROR_CODES, LegacyApiResponse, ErrorResponse } from './config';
import { tokenManager } from './token';
import { handleApiError } from './errors';
import { notify } from '@/components/ui/notification';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Simple request cache to prevent duplicate requests
const requestCache = new Map<string, Promise<any>>();
const CACHE_DURATION = 5000; // 5 seconds
let lastCacheKey: string | null = null;
let lastCacheTimestamp: number = 0;
let sessionVersion = 0; // increments whenever tokens change to isolate cache per session

export const clearRequestCache = () => {
  requestCache.clear();
  lastCacheKey = null;
  lastCacheTimestamp = 0;
};

// Ensure request cache is wiped whenever tokens change (login/logout/refresh)
tokenManager.subscribe(() => {
  sessionVersion += 1;
  clearRequestCache();
  // Reset any in-flight refresh attempt tied to previous session
  isRefreshing = false;
  refreshPromise = null;
});

// Event for auth state changes
type AuthEventCallback = () => void;
let onUnauthorizedCallback: AuthEventCallback | null = null;

export const setOnUnauthorized = (callback: AuthEventCallback) => {
  onUnauthorizedCallback = callback;
};

// Refresh token response type (matches login tokens structure)
interface RefreshTokenResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
}

// Refresh token function
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenManager.getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    // Handle response format: { status: "success", data: { user, tokens: { ... } } }
    if (data.status === 'success' && data.data?.tokens) {
      const { accessToken, refreshToken: newRefreshToken, expiresIn } = data.data.tokens;
      tokenManager.setTokens(accessToken, newRefreshToken, expiresIn);
      return true;
    }

    // Fallback for alternative response format
    if (data.success && data.data?.accessToken) {
      tokenManager.setAccessToken(data.data.accessToken);
      if (data.data.refreshToken) {
        tokenManager.setRefreshToken(data.data.refreshToken);
      }
      return true;
    }

    return false;
  } catch {
    return false;
  }
}


// List of endpoints that should skip authentication
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/password-recovery',
  '/auth/reset-password',
  '/auth/logout',
  '/health'
];

// Helper function to determine if an endpoint should skip auth
const shouldSkipAuth = (endpoint: string): boolean => {
  return PUBLIC_ENDPOINTS.some(publicEndpoint => endpoint.startsWith(publicEndpoint));
};

export const shouldCacheGetEndpoint = (endpoint: string): boolean => {
  const isPaginated = endpoint.includes('page=') || endpoint.includes('limit=');
  if (!isPaginated) return true;
  return endpoint.startsWith('/analytics/');
};

// Main API request function with automatic token refresh
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, skipAuth = shouldSkipAuth(endpoint) } = options;

  // Create cache key for GET requests only
  const cacheKey = method === 'GET' ? `${sessionVersion}:${method}:${endpoint}:${JSON.stringify(body || {})}` : null;

  const shouldUseGetCache = method === 'GET' && shouldCacheGetEndpoint(endpoint);
  if (cacheKey && shouldUseGetCache && requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth header if not skipped
  if (!skipAuth) {
    const accessToken = tokenManager.getAccessToken();
    if (accessToken) {
      requestHeaders['Authorization'] = `Bearer ${accessToken}`;
    } else {
      // For non-auth endpoints, we should have a token
      // If no token exists, this will likely result in a 401 which will trigger the auth flow
      console.warn('No access token available for authenticated request to:', endpoint);
    }
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    cache: 'no-store',
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  // Clear cache for any mutation request
  if (method !== 'GET') {
    requestCache.clear();
  }

  const requestPromise = (async () => {
    try {
      let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      // Check for new access token in response header
      const newAccessToken = response.headers.get('X-New-Access-Token');
      if (newAccessToken) {
        tokenManager.setAccessToken(newAccessToken);
      }

      // Handle rate limiting
      if (response.status === 429) {
        const rateLimitReset = response.headers.get('X-RateLimit-Reset');
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000) : undefined;
        const retryAfter = rateLimitReset
          ? Math.ceil((parseInt(rateLimitReset) * 1000 - Date.now()) / 1000)
          : 60;
        const resetMessage = resetTime ? ` Try again after ${resetTime.toLocaleTimeString()}.` : '';

        if (rateLimitRemaining === '0') {
          notify.error(`Rate Limit Exceeded: Too many requests. Please wait ${retryAfter} seconds before trying again.`);
        }

        throw new ApiRequestError({
          status: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          error: `Rate limit exceeded.${resetMessage}`,
        }, resetTime, retryAfter);
      }

      // Handle role-mismatch FORBIDDEN (403): a stale JWT from a previous session
      // (different role) snuck into this request. Reload the page — tokens are still
      // valid so the session is preserved and all requests retry correctly.
      // Do NOT log the user out; that's disruptive and unnecessary.
      if (response.status === 403 && !skipAuth) {
        const errorData = await response.json().catch(() => ({
          status: 403,
          code: 'FORBIDDEN',
          message: 'Forbidden',
        })) as ErrorResponse;

        // Detect: server says role X but stored user has role Y → stale JWT
        const storedRole = (() => {
          try { return JSON.parse(localStorage.getItem('affiliate_user') || '{}').role as string | undefined; } catch { return undefined; }
        })();
        const serverMsg = errorData.message || '';
        const isRoleMismatch =
          storedRole &&
          serverMsg.includes("User role is") &&
          !serverMsg.includes(`User role is '${storedRole}'`);

        if (isRoleMismatch) {
          // Reload — do NOT clear tokens so the current session survives.
          window.location.reload();
        }

        throw new ApiRequestError(errorData);
      }

      // Handle unauthorized errors
      if (response.status === 401 && !skipAuth) {
        const errorData = await response.json().catch(() => ({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        })) as ErrorResponse;

        // Check if this is a token-related error
        if (TOKEN_ERROR_CODES.includes(errorData.code)) {
          // Try to refresh the token
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = refreshAccessToken();
          }

          const refreshSuccess = await refreshPromise;
          isRefreshing = false;
          refreshPromise = null;

          if (refreshSuccess) {
            // Retry the original request with new token
            const newAccessToken = tokenManager.getAccessToken();
            if (newAccessToken) {
              requestHeaders['Authorization'] = `Bearer ${newAccessToken}`;
            }
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
              ...config,
              headers: requestHeaders,
            });
          } else {
            // Refresh failed, trigger logout
            tokenManager.clearTokens();
            onUnauthorizedCallback?.();
            throw new ApiRequestError(errorData);
          }
        } else {
          throw new ApiRequestError(errorData);
        }
      }

      const data = await response.json() as ApiResponse<T> | LegacyApiResponse<T>;

      // Handle API-level errors (status: "error")
      if ((data as ApiResponse<T>).status === 'error') {
        const errorData = data as ApiResponse<T>;
        const errorCode = errorData.code || 'ERROR';
        const errorMessage = errorData.message || 'An error occurred';

        // Trigger global toast for API errors
        handleApiError(errorData, errorMessage);

        throw new ApiRequestError({
          code: errorCode,
          message: errorMessage,
          error: errorMessage,
          status: response.status,
        });
      }

      // Handle legacy format errors (success: false)
      const legacyData = data as LegacyApiResponse<T>;
      if (legacyData.success === false) {
        const errorCode = legacyData.code || 'ERROR';
        const errorMessage = legacyData.error || legacyData.message || 'An error occurred';

        // Trigger global toast for API errors
        handleApiError(legacyData, errorMessage);

        throw new ApiRequestError({
          code: errorCode,
          message: errorMessage,
          error: errorMessage,
          status: response.status,
        });
      }

      if (!response.ok) {
        throw new ApiRequestError(data as ApiError);
      }

      return data as ApiResponse<T>;
    } catch (error) {
      if (error instanceof ApiRequestError) {
        throw error;
      }
      // Network or other errors
      const networkError = new ApiRequestError({
        status: 500,
        code: 'NETWORK_ERROR',
        error: error instanceof Error ? error.message : 'Network error occurred',
      });
      handleApiError(networkError);
      throw networkError;
    } finally {
      // Remove from cache after completion
      if (cacheKey) {
        setTimeout(() => {
          requestCache.delete(cacheKey);
        }, CACHE_DURATION);
      }
    }
  })();

  if (cacheKey && shouldUseGetCache) {
    requestCache.set(cacheKey, requestPromise);
  }

  return requestPromise;
}


// Custom error class for API errors
export class ApiRequestError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;
  public resetTime?: Date;
  public retryAfter?: number;

  constructor(
    error: ApiError | { code: string; message?: string; error?: string; status?: number },
    resetTime?: Date,
    retryAfter?: number
  ) {
    const errorObj = error as Record<string, unknown>;
    const message = errorObj.message as string || errorObj.error as string || 'An error occurred';
    super(message);
    this.name = 'ApiRequestError';
    this.status = typeof errorObj.status === 'number' ? errorObj.status as number : 400;
    this.code = errorObj.code as string || 'ERROR';
    this.details = errorObj.details;
    this.resetTime = resetTime;
    this.retryAfter = retryAfter;
  }
}

// API client with convenience methods
export const apiClient = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
