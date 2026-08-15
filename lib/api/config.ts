// API Configuration - Base URL from API_REFERENCE_V1.md
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';
};

export const API_BASE_URL = getBaseUrl();

// Token storage keys
export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'affiliate_user';

// New API Response Schema: { status, data, pagination, message }
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: string;
  timestamp?: string;
  pagination?: PaginationMeta;
}

export interface ApiError {
  status: 'error';
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  status: 'success';
  data: T[];
  pagination: PaginationMeta;
  message: string;
}

export interface ErrorResponse {
  status: 'error';
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// Legacy type aliases for backward compatibility during migration
export type LegacyApiResponse<T = unknown> = {
  success?: boolean;
  status?: number | string;
  data?: T;
  message?: string;
  timestamp?: string;
  code?: string;
  error?: string;
};

// Helper to check if response is successful (supports both legacy and new format)
export function isSuccessResponse<T>(response: ApiResponse<T> | LegacyApiResponse<T>): boolean {
  const legacyResponse = response as LegacyApiResponse<T>;
  const newResponse = response as ApiResponse<T>;
  return legacyResponse.success === true || newResponse.status === 'success';
}

// Helper to get data from response (supports both legacy and new format)
export function getResponseData<T>(response: ApiResponse<T> | LegacyApiResponse<T>): T | null {
  const newResponse = response as ApiResponse<T>;
  const legacyResponse = response as LegacyApiResponse<T>;
  
  if (newResponse.data !== undefined) {
    return newResponse.data;
  }
  if (legacyResponse.data !== undefined) {
    return legacyResponse.data;
  }
  return null;
}

// Helper to get pagination from response
export function getPagination(response: ApiResponse<unknown> | LegacyApiResponse<unknown>): PaginationMeta | null {
  const newResponse = response as ApiResponse<unknown>;
  const legacyResponse = response as LegacyApiResponse<unknown>;
  
  if (newResponse.pagination) {
    return newResponse.pagination;
  }
  if (legacyResponse.data && typeof legacyResponse.data === 'object' && 'pagination' in legacyResponse.data) {
    return (legacyResponse.data as Record<string, unknown>).pagination as PaginationMeta;
  }
  return null;
}

// Error codes that trigger token refresh
export const TOKEN_ERROR_CODES = ['UNAUTHORIZED', 'TOKEN_EXPIRED', 'INVALID_TOKEN'];
