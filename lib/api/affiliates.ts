import { apiClient, ApiRequestError } from './client';
import { isSuccessResponse, LegacyApiResponse } from './config';
import { isStoredAffiliate } from './user-role';
import type { ConversionType } from './conversion-types';

export interface Affiliate {
  id: number;
  userId: number;
  email: string;
  fullName: string;
  companyName: string | null;
  country: string | null;
  phone: string | null;
  contactPlatform: string | null;
  contactIdentifier: string | null;
  trackingId: string | null;
  sourceUrl: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'deleted';
  pendingBalance: string;
  totalEarned: string;
  activeCodesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateMeResponse {
  id: number;
  userId: number;
  email: string;
  fullName: string;
  companyName: string | null;
  country: string | null;
  phone: string | null;
  status: string;
  contactPlatform: string | null;
  contactIdentifier: string | null;
  trackingId: string | null;
  sourceUrl: string | null;
  pendingBalance: string;
  totalEarned: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateStats {
  id: number;
  pendingBalance: string;
  totalEarned: string;
}

export interface AffiliatesPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AffiliateListResponse {
  affiliates: Affiliate[];
  pagination: AffiliatesPagination;
  total?: number;
}

export interface UpdateContactRequest {
  contactPlatform: 'telegram' | 'whatsapp' | 'skype' | 'teams';
  contactIdentifier: string;
  sourceUrl?: string;
}

export interface DetailedSummary {
  affiliate: {
    id: number;
    userId: number;
    trackingId: string;
    contactPlatform: string;
    contactIdentifier: string;
    sourceUrl: string;
    pendingBalance: string;
    totalEarned: string;
    createdAt: string;
    updatedAt: string;
  };
  user: {
    email: string;
    fullName: string;
    companyName: string | null;
    country: string | null;
    phone: string | null;
    role: string;
    status: string;
    registrationDate: string;
  };
  plans: {
    assignmentId: number;
    planId: number;
    planName: string;
    baseCommissionPercentage: string;
    commissionDurationType: string;
    durationMonths: number | null;
    effectiveCommission: string;
    effectiveDurationType: string;
    effectiveDurationMonths: number | null;
    hasOverride: boolean;
    isActive: boolean;
    assignmentDate: string;
  }[];
  sites: {
    assignmentId: number;
    siteId: number;
    siteName: string;
    baseUrl: string;
    description: string | null;
    status: string;
    isActive: boolean;
    assignmentDate: string;
  }[];
  referralCodes: {
    codeId: number;
    code: string;
    label: string | null;
    siteId: number;
    siteName: string;
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
    totalPayments: number;
    completedPayments: number;
    totalPaid: string;
  };
  recentConversions: {
    id: number;
    siteId: number;
    siteName: string;
    conversionDate: string;
    purchaseAmount: string;
    currency: string;
    commissionAmount: string;
    commissionPercentage: string;
    status: string;
    conversionType: string;
    customerEmail: string | null;
    isTest: boolean;
    rawPayload?: any;
  }[];
  recentPayments: {
    id: number;
    amount: string;
    createdAt: string;
    status: string;
    notes: string | null;
  }[];
  recentClicks: {
    id: number;
    referralCodeId: number;
    code: string;
    siteName: string;
    ipAddress: string | null;
    referrer: string | null;
    landingPage: string | null;
    createdAt: string;
  }[];
  performanceBySite: {
    siteId: number;
    siteName: string;
    description?: string | null;
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
    siteName: string;
    clicks: number;
    conversions: number;
    conversionRate: string;
    revenue: string;
    commission: string;
  }[];
  conversionTypes?: ConversionType[];
}

export interface TrackingLink {
  siteId: number;
  siteName: string;
  siteUrl: string;
  baseUrl: string;
  isActive: boolean;
  assignmentDate: string;
  trackingId: string;
  trackingUrls: {
    subdirectory: string;
    queryParam: string;
  };
}

function getResponseData<T>(response: LegacyApiResponse<T> | { data?: T }): T | null {
  const raw = response as Record<string, unknown>;
  if (raw.data) {
    return raw.data as T;
  }
  return null;
}


export const affiliatesService = {
  getDetailedSummary: async (id: number): Promise<DetailedSummary | null> => {
    const response = await apiClient.get<DetailedSummary>(`/affiliates/${id}/detailed-summary`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getAll: async (params?: { limit?: number; page?: number; status?: string; platform?: string }): Promise<AffiliateListResponse> => {
    const searchParams = new URLSearchParams();
    const limit = params?.limit || 10;
    const page = params?.page || 1;

    searchParams.set('page', page.toString());
    searchParams.set('limit', limit.toString());
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.platform) searchParams.set('platform', params.platform);

    const query = searchParams.toString();
    const response = await apiClient.get<Affiliate[] | AffiliateListResponse>(`/affiliates${query ? `?${query}` : ''}`);

    if (isSuccessResponse(response)) {
      const raw = response as unknown as Record<string, unknown>;
      const items: Affiliate[] = Array.isArray(raw.data) ? raw.data as Affiliate[] : ((raw.data as Record<string, unknown>)?.affiliates as Affiliate[] || (raw.data as Record<string, unknown>)?.data as Affiliate[] || []);
      const pagination: AffiliatesPagination = (raw.pagination as AffiliatesPagination) || ((raw.data as Record<string, unknown>)?.pagination as AffiliatesPagination) || { total: items.length, page: 1, pageSize: items.length, totalPages: 1, hasNext: false, hasPrev: false };
      return { affiliates: items, pagination };
    }
    const emptyPagination: AffiliatesPagination = { total: 0, page: 1, pageSize: 10, totalPages: 0, hasNext: false, hasPrev: false };
    return { affiliates: [], pagination: emptyPagination };
  },

  getById: async (id: number): Promise<Affiliate | null> => {
    const response = await apiClient.get<Affiliate>(`/affiliates/${id}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getByUserId: async (userId: number): Promise<Affiliate | null> => {
    const response = await apiClient.get<Affiliate>(`/affiliates/user/${userId}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getByCode: async (code: string): Promise<Affiliate | null> => {
    const response = await apiClient.get<Affiliate>(`/affiliates/code/${code}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getMe: async (): Promise<AffiliateMeResponse | null> => {
    if (!isStoredAffiliate()) return null;
    const response = await apiClient.get<AffiliateMeResponse>(`/affiliates/me`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getStats: async (id: number): Promise<AffiliateStats | null> => {
    const response = await apiClient.get<AffiliateStats>(`/affiliates/${id}/stats`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getTrackingLinks: async (): Promise<TrackingLink[]> => {
    if (!isStoredAffiliate()) return [];
    const response = await apiClient.get<TrackingLink[]>('/affiliates/me/tracking-links');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return [];
  },

  approve: async (id: number): Promise<Affiliate> => {
    const response = await apiClient.patch<Affiliate>(`/affiliates/${id}`, { status: 'approved' });
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'APPROVE_FAILED',
      error: (errorData.error as string) || 'Failed to approve affiliate',
    });
  },

  reject: async (id: number): Promise<Affiliate> => {
    const response = await apiClient.patch<Affiliate>(`/affiliates/${id}`, { status: 'rejected' });
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'REJECT_FAILED',
      error: (errorData.error as string) || 'Failed to reject affiliate',
    });
  },

  suspend: async (id: number): Promise<Affiliate> => {
    const response = await apiClient.patch<Affiliate>(`/affiliates/${id}`, { status: 'suspended' });
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'SUSPEND_FAILED',
      error: (errorData.error as string) || 'Failed to suspend affiliate',
    });
  },

  unsuspend: async (id: number): Promise<Affiliate> => {
    const response = await apiClient.patch<Affiliate>(`/affiliates/${id}`, { status: 'approved' });
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UNSUSPEND_FAILED',
      error: (errorData.error as string) || 'Failed to reactivate affiliate',
    });
  },

  updateContact: async (id: number, data: { contactPlatform: string; contactIdentifier: string; sourceUrl?: string }): Promise<Affiliate> => {
    const payload = {
      contact_platform: data.contactPlatform,
      contact_identifier: data.contactIdentifier,
      source_url: data.sourceUrl,
    };
    const response = await apiClient.patch<Affiliate>(`/affiliates/${id}/contact`, payload);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UPDATE_FAILED',
      error: (errorData.error as string) || 'Failed to update contact',
    });
  },


  delete: async (id: number): Promise<Affiliate> => {
    const response = await apiClient.patch<Affiliate>(`/affiliates/${id}`, { status: 'deleted' });
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'DELETE_FAILED',
      error: (errorData.error as string) || 'Failed to delete affiliate',
    });
  },

  search: async (params?: { q?: string; status?: string; platform?: string; limit?: number }): Promise<Affiliate[]> => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.platform && params.platform !== 'all') searchParams.set('platform', params.platform);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    else searchParams.set('limit', '20');

    const query = searchParams.toString();
    const response = await apiClient.get<Affiliate[]>(`/affiliates/search${query ? `?${query}` : ''}`);

    if (isSuccessResponse(response) && response.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (typeof response.data === 'object' && Array.isArray((response.data as Record<string, unknown>).data)) {
        return (response.data as Record<string, unknown>).data as Affiliate[];
      }
    }
    return [];
  },
};
