import { apiClient, ApiRequestError } from './client';
import { isSuccessResponse, LegacyApiResponse } from './config';

// Key-value based settings
export interface Setting {
  id: number;
  settingKey: string;
  settingValue: string;
  dataType: 'string' | 'int' | 'float' | 'bool' | 'json';
  description: string | null;
  updatedAt?: string;
}

export interface SettingsListResponse {
  data: Setting[];
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface CreateSettingRequest {
  setting_key: string;
  setting_value: string;
  data_type: 'string' | 'int' | 'float' | 'bool' | 'json';
  description?: string;
}

export interface UpdateSettingRequest {
  setting_value: string;
  data_type?: 'string' | 'int' | 'float' | 'bool' | 'json';
  description?: string;
}

export interface BatchUpdateRequest {
  updates: { setting_key: string; setting_value: string }[];
}

export interface GroupedSettings {
  branding: Setting[];
  commission: Setting[];
  tracking: Setting[];
  email: Setting[];
  registration: Setting[];
  security: Setting[];
  currency: Setting[];
  other: Setting[];
}

export interface InitializeSettingsResponse {
  created: number;
}

// Known setting keys from the API
export const SETTING_KEYS = {
  PANEL_NAME: 'panel_name',
  PANEL_LOGO_URL: 'panel_logo_url',
  DEFAULT_COMMISSION_PERCENTAGE: 'default_commission_percentage',
  TRACKING_COOKIE_DURATION_DAYS: 'tracking_cookie_duration_days',
  SMTP_HOST: 'smtp_host',
  SMTP_PORT: 'smtp_port',
  SMTP_USERNAME: 'smtp_username',
  EMAIL_FROM_NAME: 'email_from_name',
  MAX_PASSWORD_AGE_DAYS: 'max_password_age_days',
  REQUIRE_2FA: 'require_2fa',
} as const;

// Legacy interfaces for backward compatibility
export interface SystemSettings {
  panelName: string;
  panelLogoUrl?: string;
  defaultCommissionPercentage: number;
  trackingCookieDurationDays: number;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  emailFromName?: string;
  maxPasswordAgeDays?: number;
  require2fa?: boolean;
}

export interface UpdateSettingsRequest {
  panelName?: string;
  logoUrl?: string;
  defaultCommission?: number;
  cookieDuration?: number;
}

export interface SmtpSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword?: string;
  smtpFrom: string;
}

export interface Plan {
  id: number;
  name: string;
  baseCommission: number;
  commissionDuration: 'one_month' | 'lifetime' | 'custom';
  customMonths?: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePlanRequest {
  name?: string;
  baseCommission?: number;
  commissionDuration?: 'one_month' | 'lifetime' | 'custom';
  customMonths?: number;
}

export const settingsService = {
  // Get all settings (paginated)
  getAll: async (limit = 100, offset = 0): Promise<Setting[]> => {
    const response = await apiClient.get<Setting[] | SettingsListResponse>(`/settings?limit=${limit}&offset=${offset}`);
    if (isSuccessResponse(response) && response.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return response.data.data || [];
    }
    return [];
  },

  // Get setting by key
  getByKey: async (key: string): Promise<Setting | null> => {
    const response = await apiClient.get<Setting>(`/settings/${encodeURIComponent(key)}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  // Create setting
  create: async (data: CreateSettingRequest): Promise<Setting> => {
    const response = await apiClient.post<Setting>('/settings', data);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'CREATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to create setting',
    });
  },

  // Update setting by key
  update: async (key: string, data: UpdateSettingRequest): Promise<Setting> => {
    const response = await apiClient.patch<Setting>(`/settings/${encodeURIComponent(key)}`, data);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UPDATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to update setting',
    });
  },

  // Delete setting by key
  delete: async (key: string): Promise<boolean> => {
    const response = await apiClient.delete(`/settings/${encodeURIComponent(key)}`);
    return isSuccessResponse(response);
  },

  // Batch update settings
  batchUpdate: async (settings: { key: string; value: string }[]): Promise<Setting[]> => {
    const updates = settings
      .filter(s => s.key && s.value !== undefined)
      .map(s => ({
        setting_key: s.key,
        setting_value: s.value,
      }));

    if (updates.length === 0) {
      return [];
    }

    const response = await apiClient.patch<Setting[]>('/settings/batch/update', { updates });
    if (isSuccessResponse(response) && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UPDATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to batch update settings',
    });
  },

  // Helper to get settings as a map
  getSettingsMap: async (): Promise<Record<string, string>> => {
    const settings = await settingsService.getAll();
    const map: Record<string, string> = {};
    settings.forEach(s => {
      map[s.settingKey] = s.settingValue;
    });
    return map;
  },

  // Get settings grouped by category
  getGroupedSettings: async (): Promise<GroupedSettings> => {
    const response = await apiClient.get<GroupedSettings>('/settings/grouped');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return {
      branding: [],
      commission: [],
      tracking: [],
      email: [],
      registration: [],
      security: [],
      currency: [],
      other: []
    };
  },

  // Initialize default settings
  initializeDefaultSettings: async (): Promise<InitializeSettingsResponse> => {
    const response = await apiClient.post<InitializeSettingsResponse>('/settings/initialize');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'INITIALIZE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to initialize default settings',
    });
  },

  // Plan endpoints
  getPlan: async (): Promise<Plan | null> => {
    const response = await apiClient.get<Plan>('/plans/default/current');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  updatePlan: async (data: UpdatePlanRequest): Promise<Plan> => {
    const response = await apiClient.put<Plan>('/plans/default', data);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UPDATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to update plan',
    });
  },

  // Get supported currencies/exchange rates
  getExchangeRates: async (): Promise<string[]> => {
    const response = await apiClient.get<any>('/settings/exchange-rates');
    if (isSuccessResponse(response) && response.data) {
      // Assume response.data is an array of currency codes or an object where keys are currency codes
      if (Array.isArray(response.data)) return response.data;
      if (typeof response.data === 'object') return Object.keys(response.data);
    }
    // Return empty list as fallback
    return [];
  },
};
