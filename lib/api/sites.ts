import { apiClient, ApiRequestError } from './client';
import { isSuccessResponse, LegacyApiResponse } from './config';

export interface Site {
  id: number;
  name: string;
  baseUrl: string;
  description: string;
  status: 'active' | 'inactive';
  publicApiKey: string;
  privateApiKey: string;
  requireSignatureVerification: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSearchResult {
  id: number;
  name: string;
  baseUrl: string;
  status: 'active' | 'inactive';
}

export interface SitesPagination {
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SitesListResponse {
  sites: Site[];
  total: number;
  limit: number;
  offset: number;
  pagination: SitesPagination;
}

export interface CreateSiteRequest {
  name: string;
  baseUrl: string;
  description?: string;
  requireSignatureVerification?: boolean;
}

export interface UpdateSiteRequest {
  name?: string;
  baseUrl?: string;
  description?: string;
  status?: 'active' | 'inactive';
  requireSignatureVerification?: boolean;
}

export interface SiteDetailedSummary {
  site: {
    id: number;
    name: string;
    baseUrl: string;
    description: string | null;
    status: 'active' | 'inactive';
    publicApiKey: string;
    privateApiKey: string;
    requireSignatureVerification: boolean;
    createdAt: string;
    updatedAt: string;
  };
  affiliates: {
    assignmentId: number;
    affiliateId: number;
    userId: number;
    trackingId: string;
    email: string;
    fullName: string;
    status: 'pending' | 'approved' | 'suspended' | 'rejected' | 'deleted';
    contactPlatform: string;
    contactIdentifier: string;
    isActive: boolean;
    assignmentDate: string;
  }[];
  referralCodes: {
    codeId: number;
    code: string;
    label: string | null;
    affiliateId: number;
    affiliateName: string;
    affiliateEmail: string;
    isActive: boolean;
    totalClicks: number;
    totalConversions: number;
    conversionRate: string;
    lastUsedAt: string | null;
    createdAt: string;
  }[];
  stats: {
    totalClicks: number;
    totalConversions: number;
    approvedConversions: number;
    pendingConversions: number;
    rejectedConversions: number;
    chargebackConversions: number;
    conversionRate: string;
    totalRevenue: string;
    approvedRevenue: string;
    totalCommission: string;
    approvedCommission: string;
    pendingCommission: string;
    averageOrderValue: string;
    uniqueCustomers: number;
    totalPayouts: number;
    completedPayouts: number;
    approvedPayouts: number;
    pendingPayouts: number;
    totalPaid: string;
  };
  siteConversions: {
    id: number;
    affiliateId: number;
    affiliateName: string;
    affiliateEmail: string;
    conversionDate: string;
    purchaseAmount: string;
    currency: string;
    commissionAmount: string;
    commissionPercentage: string;
    status: 'pending' | 'approved' | 'rejected' | 'chargeback';
    conversionType: 'sale' | 'lead' | 'signup' | 'trial' | 'token' | 'other';
    customerEmail?: string;
    isTest: boolean;
    referralCode: string | null;
  }[];
  recentPayouts: {
    id: number;
    affiliateId: number;
    affiliateName: string;
    amount: string;
    createdAt: string;
    status: 'pending' | 'completed' | 'failed' | 'approved' | 'rejected';
    notes: string | null;
  }[];
  performanceByAffiliate: {
    affiliateId: number;
    affiliateName: string;
    affiliateEmail: string;
    conversions: number;
    approvedConversions: number;
    revenue: string;
    commission: string;
    approvedCommission: string;
  }[];
  topReferralCodes: {
    codeId: number;
    code: string;
    label: string | null;
    affiliateName: string;
    clicks: number;
    conversions: number;
    conversionRate: string;
    revenue: string;
    commission: string;
  }[];
}

export const sitesService = {
  getDetailedSummary: async (id: number): Promise<SiteDetailedSummary | null> => {
    const response = await apiClient.get<SiteDetailedSummary>(`/sites/${id}/detailed-summary`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },


  getAll: async (params?: { limit?: number; offset?: number; page?: number; status?: string }): Promise<SitesListResponse> => {
    const searchParams = new URLSearchParams();
    const limit = params?.limit || 10;
    const page = params?.page || 1;
    const offset = (page - 1) * limit;

    searchParams.set('offset', offset.toString());
    searchParams.set('limit', limit.toString());
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);

    const query = searchParams.toString();
    const response = await apiClient.get<Site[] | SitesListResponse>(`/sites${query ? `?${query}` : ''}`);

    if (isSuccessResponse(response)) {
      const raw = response as any;
      const items: Site[] = Array.isArray(raw.data) ? raw.data : (raw.data?.sites || raw.data?.data || []);
      const pagination: SitesPagination = raw.pagination || raw.data?.pagination || { total: items.length, limit: items.length, offset: 0, page: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
      return { sites: items, total: pagination.total, limit: pagination.limit, offset: pagination.offset ?? 0, pagination };
    }
    const emptyPagination: SitesPagination = { total: 0, limit: 0, offset: 0, page: 1, totalPages: 0, hasNextPage: false, hasPreviousPage: false };
    return { sites: [], total: 0, limit: 0, offset: 0, pagination: emptyPagination };
  },

  search: async (params?: { q?: string; limit?: number }): Promise<SiteSearchResult[]> => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    searchParams.set('limit', (params?.limit || 20).toString());

    const query = searchParams.toString();
    const response = await apiClient.get<SiteSearchResult[]>(`/sites/search${query ? `?${query}` : ''}`);
    if (isSuccessResponse(response) && response.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // Handle nested data.data from some API endpoints
      if (typeof response.data === 'object' && Array.isArray((response.data as any).data)) {
        return (response.data as any).data;
      }
    }
    return [];
  },

  getById: async (id: number): Promise<Site | null> => {
    const response = await apiClient.get<Site>(`/sites/${id}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  create: async (data: { name: string; baseUrl: string; description?: string; requireSignatureVerification?: boolean }): Promise<Site> => {
    const payload: CreateSiteRequest = {
      name: data.name,
      baseUrl: data.baseUrl,
      description: data.description,
      requireSignatureVerification: data.requireSignatureVerification,
    };
    const response = await apiClient.post<Site>('/sites', payload);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'CREATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to create site',
    });
  },

  update: async (id: number, data: { name?: string; baseUrl?: string; description?: string; status?: 'active' | 'inactive'; requireSignatureVerification?: boolean }): Promise<Site> => {
    const payload: UpdateSiteRequest = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.baseUrl !== undefined) payload.baseUrl = data.baseUrl;
    if (data.description !== undefined) payload.description = data.description;
    if (data.status !== undefined) payload.status = data.status;
    if (data.requireSignatureVerification !== undefined) payload.requireSignatureVerification = data.requireSignatureVerification;

    const response = await apiClient.patch<Site>(`/sites/${id}`, payload);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UPDATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to update site',
    });
  },

  delete: async (id: number): Promise<boolean> => {
    const response = await apiClient.delete(`/sites/${id}`);
    if (isSuccessResponse(response)) {
      return true;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'DELETE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to delete site',
    });
  },

  toggleStatus: async (id: number): Promise<Site> => {
    const response = await apiClient.patch<Site>(`/sites/${id}/toggle`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'TOGGLE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to toggle site status',
    });
  },

  regenerateKeys: async (id: number): Promise<{ publicApiKey: string; privateApiKey: string }> => {
    const response = await apiClient.post<{ publicApiKey: string; privateApiKey: string }>(`/sites/${id}/regenerate-keys`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'REGENERATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to regenerate keys',
    });
  },

  testWebhook: async (params: {
    siteId: number;
    publicApiKey: string;
    privateApiKey: string;
    referralCode: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerFirstName?: string;
    customerLastName?: string;
    customerUsername?: string;
    conversionType?: string;
    referrer?: string;
    landingPage?: string;
    userAgent?: string;
    ip?: string;
    isTest?: boolean;
  }): Promise<{ success: boolean; message: string; data?: unknown }> => {
    const {
      siteId,
      publicApiKey,
      privateApiKey,
      referralCode,
      amount,
      currency,
      customerEmail,
      customerFirstName,
      customerLastName,
      customerUsername,
      conversionType,
      referrer,
      landingPage,
      userAgent,
      ip,
      isTest = true,
    } = params;

    // Generate idempotency key
    const idempotencyKey = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const purchaseDate = new Date().toISOString();

    // Build payload with new optional fields
    const payload = {
      referral_code: referralCode,
      amount_cents: amount,
      currency: currency.toUpperCase(),
      customer_email: customerEmail,
      is_test: isTest,
      idempotency_key: idempotencyKey,
      timestamp: purchaseDate,
      purchase_date: purchaseDate,
      ...(customerFirstName && { customer_first_name: customerFirstName }),
      ...(customerLastName && { customer_last_name: customerLastName }),
      ...(customerUsername && { customer_username: customerUsername }),
      ...(conversionType && { conversion_type: conversionType }),
      ...(referrer && { referrer }),
      ...(landingPage && { landing_page: landingPage }),
      ...(userAgent && { user_agent: userAgent }),
      ...(ip && { ip })
    };

    // Get API base URL
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

    try {
      // Make the webhook request with simplified authentication
      const response = await fetch(`${baseUrl}/webhooks/conversions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-private-api-key': privateApiKey, // Only this header needed!
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && (data.success || data.status === 'success')) {
        return { success: true, message: data.message || 'Webhook sent successfully', data: data.data };
      }

      return {
        success: false,
        message: data.message || `Webhook failed with status ${response.status}`,
        data: data
      };
    } catch (networkError: any) {
      return {
        success: false,
        message: `Network error: ${networkError.message}`,
        data: { error: networkError.message }
      };
    }
  },
};
