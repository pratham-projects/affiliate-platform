import { apiClient, ApiRequestError } from './client';
import { isSuccessResponse, LegacyApiResponse } from './config';

export interface ReferralCode {
  id: number;
  affiliateId: number;
  affiliateName: string;
  siteId: number;
  siteName: string;
  siteUrl?: string;
  code: string;
  label?: string | null;
  isActive: boolean;
  affiliateEmail?: string;
  totalClicks?: number;
  totalConversions?: number;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  referralUrl?: string;
}

export interface CreateReferralCodeRequest {
  affiliateId: number;
  siteId: number;
  code?: string;
}

export interface ReferralCodesListResponse {
  referralCodes: ReferralCode[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    offset?: number;
  };
}

export const referralCodesService = {
  getAll: async (params?: { page?: number; limit?: number; affiliateId?: number; siteId?: number; isActive?: boolean; startDate?: string; endDate?: string }): Promise<ReferralCodesListResponse> => {
    const searchParams = new URLSearchParams();
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    searchParams.set('offset', offset.toString());
    searchParams.set('limit', limit.toString());
    if (params?.affiliateId !== undefined) searchParams.set('affiliateId', params.affiliateId.toString());
    if (params?.siteId !== undefined) searchParams.set('siteId', params.siteId.toString());
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = `?${searchParams.toString()}`;
    const response = await apiClient.get<ReferralCode[] | ReferralCodesListResponse>(`/referral-codes${query}`);
    if (isSuccessResponse(response)) {
      const data = (response as any);
      const items = Array.isArray(data.data) ? data.data : (data.data?.referralCodes || data.data?.data || []);
      const pagination = data.pagination || data.data?.pagination || { page: 1, limit: items.length, total: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
      return { referralCodes: items, pagination };
    }
    return { referralCodes: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  },

  getById: async (id: number): Promise<ReferralCode | null> => {
    const response = await apiClient.get<ReferralCode>(`/referral-codes/${id}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getByCode: async (code: string): Promise<ReferralCode | null> => {
    const response = await apiClient.get<ReferralCode>(`/referral-codes/code/${encodeURIComponent(code)}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  create: async (data: CreateReferralCodeRequest): Promise<ReferralCode> => {
    const response = await apiClient.post<ReferralCode>('/referral-codes', data);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'CREATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to create referral code',
    });
  },

  // Manual deletion of referral codes is disabled to prevent data inconsistency.
  // Referral codes are hidden automatically when an affiliate or their account is deleted.
  /*
  delete: async (id: number): Promise<boolean> => {
    const response = await apiClient.delete(`/referral-codes/${id}`);
    if (isSuccessResponse(response)) {
      return true;
    }
    throw new ApiRequestError({
      code: (response as any).code || 'DELETE_FAILED',
      message: response.message || 'Failed to delete referral code',
    });
  },
  */

  update: async (id: number, data: { label: string }): Promise<ReferralCode> => {
    const response = await apiClient.patch<ReferralCode>(`/referral-codes/${id}`, data);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UPDATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to update referral code',
    });
  },

  toggle: async (id: number): Promise<ReferralCode> => {
    const response = await apiClient.patch<ReferralCode>(`/referral-codes/${id}/toggle`, {});
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'TOGGLE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to toggle referral code',
    });
  },

  regenerate: async (id: number): Promise<ReferralCode> => {
    const response = await apiClient.post<ReferralCode>(`/referral-codes/${id}/regenerate`, {});
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'REGENERATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to regenerate referral code',
    });
  },

  getMyReferralCodes: async (params?: { page?: number; limit?: number; siteId?: number; isActive?: boolean; startDate?: string; endDate?: string }): Promise<ReferralCodesListResponse> => {
    const searchParams = new URLSearchParams();
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    searchParams.set('offset', offset.toString());
    searchParams.set('limit', limit.toString());
    if (params?.siteId !== undefined) searchParams.set('siteId', params.siteId.toString());
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<ReferralCode[] | ReferralCodesListResponse>(`/referral-codes/me${query}`);

    if (isSuccessResponse(response)) {
      const data = (response as any);
      const items = Array.isArray(data.data) ? data.data : (data.data?.referralCodes || data.data?.data || []);
      const pagination = data.pagination || data.data?.pagination || { page: 1, limit: items.length, total: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
      return { referralCodes: items, pagination };
    }
    return { referralCodes: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  },

  getStats: async (id: number): Promise<{ code: string; conversions: number; earnings: string } | null> => {
    const response = await apiClient.get<any>(`/referral-codes/${id}/stats`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  search: async (params?: { q?: string; affiliateId?: number; siteId?: number; isActive?: boolean; limit?: number }): Promise<ReferralCode[]> => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.affiliateId) searchParams.set('affiliateId', params.affiliateId.toString());
    if (params?.siteId) searchParams.set('siteId', params.siteId.toString());
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    else searchParams.set('limit', '20');

    const query = searchParams.toString();
    const response = await apiClient.get<ReferralCode[]>(`/referral-codes/search${query ? `?${query}` : ''}`);

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
};
