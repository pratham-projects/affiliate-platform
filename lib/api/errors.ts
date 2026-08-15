import { notify } from '@/components/ui/notification';

export interface ApiErrorResponse {
  status: 'error';
  code: string;
  message?: string;
  timestamp?: string;
}

export interface ParsedError {
  code: string;
  message: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource could not be found.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  CONFLICT: 'This resource already exists or conflicts with existing data.',
  DUPLICATE_ERROR: 'An account with this email already exists. Try logging in instead.',
  PAYMENT_REQUIRED: 'Payment is required to complete this action.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_TOKEN: 'Invalid authentication token. Please log in again.',
  DATABASE_ERROR: 'A database error occurred. Please try again later.',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  APPROVE_FAILED: 'Failed to approve. Please try again.',
  REJECT_FAILED: 'Failed to reject. Please try again.',
  SUSPEND_FAILED: 'Failed to suspend. Please try again.',
  UNSUSPEND_FAILED: 'Failed to reactivate. Please try again.',
  UPDATE_FAILED: 'Failed to update. Please try again.',
  DELETE_FAILED: 'Failed to delete. Please try again.',
  CREATE_FAILED: 'Failed to create. Please try again.',
  BULK_APPROVE_FAILED: 'Failed to bulk approve. Please try again.',
  COMPLETE_FAILED: 'Failed to complete. Please try again.',
  SETTLE_ALL_FAILED: 'Failed to settle payments. Please try again.',
  APPROVE_ALL_FAILED: 'Failed to approve all. Please try again.',
  REGISTRATION_FAILED: 'Registration failed. Please try again.',
  PASSWORD_RECOVERY_FAILED: 'Failed to send recovery email. Please try again.',
  PASSWORD_RESET_FAILED: 'Failed to reset password. Please try again.',
  LOGIN_FAILED: 'Invalid email or password.',
  UNAUTHORIZED_ACCESS: 'You are not authorized to access this resource.',
  RESOURCE_NOT_FOUND: 'The requested resource could not be found.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  ACCESS_DENIED: 'Access denied. You do not have permission.',
  INVALID_REQUEST: 'Invalid request. Please check your input.',
  SERVER_ERROR: 'Server error. Please try again later.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again.',
};

export function getUserFriendlyMessage(code: string): string {
  return ERROR_MESSAGES[code] || 'An error occurred. Please try again.';
}

export function parseApiError(error: unknown): ParsedError {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    if (err.code && typeof err.code === 'string') {
      return {
        code: err.code,
        message: err.message as string || err.error as string || 'An error occurred',
      };
    }

    if (err.error && typeof err.error === 'string') {
      return {
        code: err.code as string || 'ERROR',
        message: err.error,
      };
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
  };
}

export function extractValidationErrors(error: unknown): Record<string, string> {
  const err = error as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (err.details && typeof err.details === 'object') {
    const details = err.details as Record<string, unknown>;
    for (const [key, value] of Object.entries(details)) {
      if (Array.isArray(value)) {
        errors[key] = value.join(', ');
      } else if (typeof value === 'string') {
        errors[key] = value;
      }
    }
  }

  return errors;
}

export interface RateLimitError {
  status: number;
  code: string;
  error: string;
  resetTime?: Date;
  retryAfter?: number;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  const err = error as Record<string, unknown>;
  return err.code === 'RATE_LIMIT_EXCEEDED' || err.status === 429;
}

export function getRetryAfterSeconds(resetTime?: Date): number {
  if (!resetTime) return 60;
  const now = new Date();
  return Math.max(1, Math.ceil((resetTime.getTime() - now.getTime()) / 1000));
}

export function handleApiError(error: unknown, customMessage?: string): void {
  const parsed = parseApiError(error);
  const message = customMessage || parsed.message;

  if (isRateLimitError(error)) {
    const err = error as RateLimitError;
    const resetTime = err.resetTime;
    const retryAfter = err.retryAfter || (resetTime ? getRetryAfterSeconds(resetTime) : 60);

    notify.error(`Rate Limit Exceeded: Too many requests. Please wait ${retryAfter} seconds before trying again.`);
    return;
  }

  // Determine display message: prefer specific API message if available and not generic,
  // otherwise use friendly mapping for known error codes.
  const friendly = parsed.code && parsed.code !== 'ERROR' ? getUserFriendlyMessage(parsed.code) : null;
  const isGenericMessage = !message || message === 'An error occurred' || message === 'ERROR' || message === parsed.code;

  const displayMessage = (!isGenericMessage)
    ? message
    : (friendly ? `${friendly} (${parsed.code})` : message);

  notify.error(displayMessage);
}

export function handleApiSuccess(message: string): void {
  notify.success(message);
}
