import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from './config';

type TokenChangeListener = () => void;
let tokenListeners: TokenChangeListener[] = [];

const notifyTokenListeners = () => {
  tokenListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('Token change listener failed', err);
    }
  });
};

const TOKEN_EXPIRES_AT_KEY = 'token_expires_at';

// Token management utilities
export const tokenManager = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  getTokenExpiresAt: (): number | null => {
    if (typeof window === 'undefined') return null;
    const expiresAt = localStorage.getItem(TOKEN_EXPIRES_AT_KEY);
    return expiresAt ? parseInt(expiresAt, 10) : null;
  },

  setTokenExpiresAt: (expiresIn: number): void => {
    if (typeof window === 'undefined') return;
    // Calculate expiration timestamp from expiresIn (seconds)
    const expiresAt = Date.now() + (expiresIn * 1000);
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt.toString());
  },

  setTokens: (accessToken: string, refreshToken: string, expiresIn?: number): void => {
    tokenManager.setAccessToken(accessToken);
    tokenManager.setRefreshToken(refreshToken);
    if (expiresIn) {
      tokenManager.setTokenExpiresAt(expiresIn);
    }
    notifyTokenListeners();
  },

  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
    localStorage.removeItem('affiliate_user'); // Double check the key
    localStorage.removeItem('token_expires_at');
    
    // Clear any potential session remnants
    try {
      sessionStorage.clear();
    } catch (e) {}

    notifyTokenListeners();
  },

  hasTokens: (): boolean => {
    return !!tokenManager.getAccessToken() && !!tokenManager.getRefreshToken();
  },

  // Check if token is expired (with 60 second buffer)
  isTokenExpired: (): boolean => {
    const expiresAt = tokenManager.getTokenExpiresAt();
    if (!expiresAt) return true;
    // Add 60 second buffer before expiration
    return Date.now() >= (expiresAt - 60000);
  },

  // Check if we have a valid (non-expired) session
  hasValidSession: (): boolean => {
    return tokenManager.hasTokens() && !tokenManager.isTokenExpired();
  },

  subscribe: (listener: TokenChangeListener): (() => void) => {
    tokenListeners.push(listener);
    return () => {
      tokenListeners = tokenListeners.filter((fn) => fn !== listener);
    };
  },
};
