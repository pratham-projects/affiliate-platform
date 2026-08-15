import { apiClient, ApiRequestError } from './client';
import { isSuccessResponse, LegacyApiResponse } from './config';

export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface PayoutRequest {
    id: number;
    affiliateId: number;
    affiliateName: string;
    affiliateEmail: string;
    requestedAmount: string;
    approvedAmount: string | null;
    currency: string;
    status: PayoutStatus;
    includedConversionIds: number[];
    excludedConversionIds: number[];
    rejectionReason: string | null;
    approvedBy: number | null;
    approvedByName: string | null;
    approvedAt: string | null;
    rejectedBy: number | null;
    rejectedByName: string | null;
    rejectedAt: string | null;
    completedAt: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PayoutConversion {
    conversionId: number;
    siteName: string;
    purchaseAmount: string;
    commissionRate: string;
    earnedCommission: string;
    conversionDate: string;
    status: string;
    isExcluded: boolean;
}

export interface SalesBreakdownItem {
    conversionId: number;
    siteId: number;
    siteName: string;
    conversionDate: string;
    purchaseAmount: string;
    commissionRate: string;
    earnedCommission: string;
    currency: string;
    status: string;
}

export interface PayoutBalanceResponse {
    availableBalance: string;
    currency: string;
    totalEarned: string;
    totalPaidOut: string;
    pendingPayouts: string;
    salesBreakdown: SalesBreakdownItem[];
}

export interface PayoutsListResponse {
    data: PayoutRequest[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface PayoutsParams {
    page?: number;
    limit?: number;
    status?: PayoutStatus;
    affiliateId?: number;
    siteId?: number;
}

export interface ConversionsResponse {
    data: PayoutConversion[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const payoutsService = {
    // Affiliate: Get available balance
    getAvailableBalance: async (): Promise<PayoutBalanceResponse | null> => {
        const response = await apiClient.get<PayoutBalanceResponse>('/payouts/balance');
        if (isSuccessResponse(response) && response.data) {
            return response.data;
        }
        return null;
    },

    // Affiliate: Create payout request
    createRequest: async (notes?: string): Promise<PayoutRequest> => {
        const response = await apiClient.post<PayoutRequest>('/payouts/request', { notes });
        if (isSuccessResponse(response) && response.data) {
            return response.data;
        }
        const errorData = response as unknown as Record<string, unknown>;
        throw new ApiRequestError({
            code: (errorData.code as string) || 'CREATE_FAILED',
            error: (errorData.error as string) || (errorData.message as string) || 'Failed to create payout request',
        });
    },

    // Get payout requests (both)
    getPayouts: async (params?: PayoutsParams): Promise<PayoutsListResponse> => {
        const searchParams = new URLSearchParams();
        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const offset = (page - 1) * limit;
        searchParams.set('offset', offset.toString());
        searchParams.set('limit', limit.toString());
        if (params?.status) searchParams.set('status', params.status);
        if (params?.affiliateId) searchParams.set('affiliateId', params.affiliateId.toString());
        if (params?.siteId) searchParams.set('siteId', params.siteId.toString());

        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        const response = await apiClient.get<PayoutsListResponse>(`/payouts${query}`);

        if (isSuccessResponse(response)) {
            const raw = response as any;
            let items: PayoutRequest[] = [];
            let pagination = { page: 1, limit: limit, total: 0, totalPages: 0 };

            if (Array.isArray(raw.data)) {
                items = raw.data;
                pagination = raw.pagination || { page, limit, total: items.length, totalPages: 1 };
            } else if (raw.data) {
                items = raw.data.payouts || raw.data.data || [];
                pagination = raw.data.pagination || raw.pagination || { page, limit, total: items.length, totalPages: 1 };
            }

            return { data: items, pagination };
        }
        return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },

    // Get specific payout request
    getById: async (id: number): Promise<PayoutRequest | null> => {
        const response = await apiClient.get<PayoutRequest>(`/payouts/${id}`);
        if (isSuccessResponse(response) && response.data) {
            return response.data;
        }
        return null;
    },

    // Admin: Get conversions for a payout request (for review before approval)
    getConversions: async (id: number, page: number = 1, limit: number = 100): Promise<ConversionsResponse> => {
        const offset = (page - 1) * limit;
        const response = await apiClient.get<any>(`/payouts/${id}/conversions?limit=${limit}&offset=${offset}`);

        if (isSuccessResponse(response)) {
            const raw = response as any;
            let items: PayoutConversion[] = [];
            let pagination = { page, limit, total: 0, totalPages: 1 };

            if (Array.isArray(raw.data)) {
                items = raw.data;
                pagination = raw.pagination || { page, limit, total: items.length, totalPages: 1 };
            } else if (raw.data) {
                items = raw.data.conversions || raw.data.data || [];
                pagination = raw.data.pagination || raw.pagination || { page, limit, total: items.length, totalPages: 1 };
            }

            return { data: items, pagination };
        }
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    },

    // Admin: Approve payout request (with optional conversion exclusions)
    approveRequest: async (
        id: number,
        excludedConversionIds?: number[],
        notes?: string
    ): Promise<PayoutRequest> => {
        const body: Record<string, any> = {};
        if (notes) body.notes = notes;
        if (excludedConversionIds && excludedConversionIds.length > 0) {
            body.excluded_conversion_ids = excludedConversionIds;
        }
        const response = await apiClient.patch<PayoutRequest>(`/payouts/${id}/approve`, body);
        if (isSuccessResponse(response) && response.data) {
            return response.data;
        }
        const errorData = response as unknown as Record<string, unknown>;
        throw new ApiRequestError({
            code: (errorData.code as string) || 'APPROVE_FAILED',
            error: (errorData.error as string) || (errorData.message as string) || 'Failed to approve payout request',
        });
    },

    // Admin: Reject payout request
    rejectRequest: async (id: number, reason: string, notes?: string): Promise<PayoutRequest> => {
        const response = await apiClient.patch<PayoutRequest>(`/payouts/${id}/reject`, {
            rejection_reason: reason,
            notes
        });
        if (isSuccessResponse(response) && response.data) {
            return response.data;
        }
        const errorData = response as unknown as Record<string, unknown>;
        throw new ApiRequestError({
            code: (errorData.code as string) || 'REJECT_FAILED',
            error: (errorData.error as string) || (errorData.message as string) || 'Failed to reject payout request',
        });
    },

    // Admin: Mark payout as completed (payment sent externally)
    completeRequest: async (id: number, notes?: string): Promise<PayoutRequest> => {
        const response = await apiClient.patch<PayoutRequest>(`/payouts/${id}/complete`, { notes });
        if (isSuccessResponse(response) && response.data) {
            return response.data;
        }
        const errorData = response as unknown as Record<string, unknown>;
        throw new ApiRequestError({
            code: (errorData.code as string) || 'COMPLETE_FAILED',
            error: (errorData.error as string) || (errorData.message as string) || 'Failed to mark payout as completed',
        });
    },

    // Admin: Cancel payout approval (revert to pending)
    cancelApproval: async (id: number, notes?: string): Promise<PayoutRequest> => {
        const response = await apiClient.patch<PayoutRequest>(`/payouts/${id}/cancel`, { notes });
        if (isSuccessResponse(response) && response.data) {
            return response.data;
        }
        const errorData = response as unknown as Record<string, unknown>;
        throw new ApiRequestError({
            code: (errorData.code as string) || 'CANCEL_FAILED',
            error: (errorData.error as string) || (errorData.message as string) || 'Failed to cancel payout approval',
        });
    },

    search: async (params?: { q?: string; affiliateId?: number; status?: string; limit?: number }): Promise<PayoutRequest[]> => {
        const searchParams = new URLSearchParams();
        if (params?.q) searchParams.set('q', params.q);
        if (params?.affiliateId) searchParams.set('affiliateId', params.affiliateId.toString());
        if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        else searchParams.set('limit', '20');

        const query = searchParams.toString();
        const response = await apiClient.get<PayoutRequest[]>(`/payouts/search${query ? `?${query}` : ''}`);

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
