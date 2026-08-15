import { apiClient, ApiRequestError } from './client';
import { isSuccessResponse, LegacyApiResponse } from './config';

export interface Conversion {
  id: number;
  siteId: number;
  siteName: string;
  siteUrl?: string;
  affiliateId: number;
  affiliateName: string;
  affiliateEmail?: string;
  customerEmail?: string;
  conversionDate: string;
  purchaseAmount: string;
  currency: string | null;
  commissionPercentage: string;
  commissionAmount: string;
  conversionType: string;
  status: 'pending' | 'approved' | 'rejected' | 'chargeback';
  isTest: boolean;
  createdAt: string;
  referralCode?: string;
  rawPayload?: any;
}

export interface ConversionsPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ConversionsListResponse {
  conversions: Conversion[];
  pagination: ConversionsPagination;
}

export interface ConversionsParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'chargeback' | 'all' | string;
  affiliateId?: number;
  siteId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  conversionType?: string;
  isTest?: boolean;
}

export const conversionsService = {
  getAll: async (params?: ConversionsParams): Promise<ConversionsListResponse> => {
    const searchParams = new URLSearchParams();
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    searchParams.set('page', page.toString());
    searchParams.set('limit', limit.toString());
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.affiliateId) searchParams.set('affiliateId', params.affiliateId.toString());
    if (params?.siteId) searchParams.set('siteId', params.siteId.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.conversionType && params.conversionType !== 'all') searchParams.set('conversionType', params.conversionType);
    if (params?.isTest !== undefined) searchParams.set('isTest', params.isTest.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<any>(`/conversions${query}`);

    if (isSuccessResponse(response)) {
      const raw = response as any;
      const items = Array.isArray(raw.data) ? raw.data : (raw.data?.conversions || raw.data?.data || []);
      const pagination: ConversionsPagination = raw.pagination || raw.data?.pagination || { page: 1, pageSize: items.length, total: items.length, totalPages: 1, hasNext: false, hasPrev: false };
      return { conversions: items, pagination };
    }
    return { conversions: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  },

  getById: async (id: number): Promise<Conversion | null> => {
    const response = await apiClient.get<Conversion>(`/conversions/${id}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getMyConversions: async (params?: ConversionsParams): Promise<ConversionsListResponse> => {
    const searchParams = new URLSearchParams();
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    searchParams.set('page', page.toString());
    searchParams.set('limit', limit.toString());
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.conversionType && params.conversionType !== 'all') searchParams.set('conversionType', params.conversionType);
    if (params?.isTest !== undefined) searchParams.set('isTest', params.isTest.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<any>(`/conversions/me${query}`);

    if (isSuccessResponse(response)) {
      const raw = response as any;
      const items: Conversion[] = Array.isArray(raw.data) ? raw.data : (raw.data?.conversions || raw.data?.data || []);
      const pagination: ConversionsPagination = raw.pagination || raw.data?.pagination || { page: 1, pageSize: items.length, total: items.length, totalPages: 1, hasNext: false, hasPrev: false };
      return { conversions: items, pagination };
    }
    return { conversions: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  },

  updateStatus: async (id: number, status: 'approved' | 'rejected' | 'chargeback', reason?: string): Promise<Conversion> => {
    const payload: { status: string; reason?: string } = { status };
    if (reason) {
      payload.reason = reason;
    }
    const response = await apiClient.patch<Conversion>(`/conversions/${id}`, payload);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UPDATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to update conversion status',
    });
  },

  approve: async (id: number): Promise<Conversion> => {
    return conversionsService.updateStatus(id, 'approved');
  },

  reject: async (id: number, reason?: string): Promise<Conversion> => {
    return conversionsService.updateStatus(id, 'rejected', reason);
  },

  chargeback: async (id: number, reason?: string): Promise<Conversion> => {
    return conversionsService.updateStatus(id, 'chargeback', reason);
  },

  search: async (params?: { q?: string; affiliateId?: number; siteId?: number; status?: string; limit?: number }): Promise<Conversion[]> => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.affiliateId) searchParams.set('affiliateId', params.affiliateId.toString());
    if (params?.siteId) searchParams.set('siteId', params.siteId.toString());
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    else searchParams.set('limit', '20');

    const query = searchParams.toString();
    const response = await apiClient.get<Conversion[]>(`/conversions/search${query ? `?${query}` : ''}`);

    if (isSuccessResponse(response) && response.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (typeof response.data === 'object' && Array.isArray((response.data as any).data)) {
        return (response.data as any).data;
      }
    }
    return [];
  },
};
