import { apiClient, ApiRequestError } from './client';
import { clearRequestCache } from './client';
import { tokenManager } from './token';
import { USER_KEY, isSuccessResponse, LegacyApiResponse } from './config';
import type { User } from '../types';

// Auth request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface LoginResponseData {
  user: User;
  tokens: LoginTokens;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  companyName?: string;
  country?: string;
  contactPlatform?: 'telegram' | 'whatsapp' | 'skype' | 'teams';
  contactIdentifier?: string;
  sourceUrl?: string;
}

export interface RegisterResponseData {
  userId: number;
  email: string;
  fullName: string;
  status: string;
  message: string;
}

export interface RegisterResponse {
  userId: number;
  email: string;
  fullName: string;
  status: string;
  message: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Auth service
export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // Ensure any prior session state is cleared before establishing a new one
    clearRequestCache();
    tokenManager.clearTokens();

    const response = await apiClient.post<LoginResponseData>(
      '/auth/login',
      credentials
    );

    if (isSuccessResponse(response) && response.data) {
      const { user, tokens } = response.data;
      const { accessToken, refreshToken, expiresIn } = tokens;
      clearRequestCache();
      tokenManager.setTokens(accessToken, refreshToken, expiresIn);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { accessToken, refreshToken, user };
    }

    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: 'UNAUTHORIZED',
      error: (errorData.error as string) || (errorData.message as string) || 'Invalid email or password',
    });
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
      const response = await apiClient.post<RegisterResponseData>(
        '/auth/register',
        data
      );

      if (isSuccessResponse(response) && response.data) {
        return response.data;
      }

      const errorData = response as unknown as Record<string, unknown>;
      throw new ApiRequestError({
        code: 'REGISTRATION_FAILED',
        error: (errorData.error as string) || (errorData.message as string) || 'Registration failed',
      });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.code === 'DUPLICATE_ERROR' || error.status === 409) {
          throw new ApiRequestError({
            code: 'DUPLICATE_ERROR',
            error: error.message || 'An account with this email already exists. Try logging in instead.',
            status: 409,
          });
        }
        throw error;
      }
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    // Clear tokens eagerly BEFORE the API call so no subsequent requests
    // (including any in-flight ones) can use old credentials.
    tokenManager.clearTokens();
    clearRequestCache();

    try {
      // /auth/logout is in PUBLIC_ENDPOINTS so it fires without an auth header.
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors – local cleanup is the priority.
    }
  },

  forgotPassword: async (email: string): Promise<void> => {
    const response = await apiClient.post<void>(
      '/auth/password-recovery',
      { email }
    );

    if (!isSuccessResponse(response)) {
      const errorData = response as unknown as Record<string, unknown>;
      throw new ApiRequestError({
        code: 'PASSWORD_RECOVERY_FAILED',
        error: (errorData.error as string) || (errorData.message as string) || 'Failed to send recovery email',
      });
    }
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    const response = await apiClient.post<void>(
      '/auth/reset-password',
      { token, newPassword }
    );

    if (!isSuccessResponse(response)) {
      const errorData = response as unknown as Record<string, unknown>;
      throw new ApiRequestError({
        code: 'PASSWORD_RESET_FAILED',
        error: (errorData.error as string) || (errorData.message as string) || 'Failed to reset password',
      });
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');

    if (isSuccessResponse(response) && response.data) {
      localStorage.setItem(USER_KEY, JSON.stringify(response.data));
      return response.data;
    }

    throw new ApiRequestError({
      code: 'UNAUTHORIZED',
      message: 'Failed to get current user',
    });
  },

  // Get stored user from localStorage (for initial load)
  getStoredUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post<void>('/auth/change-password', data);
  },
};
