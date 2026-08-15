import { apiClient, ApiRequestError } from './client';
import { isSuccessResponse, LegacyApiResponse } from './config';

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'void';

export interface Payment {
  id: number;
  conversionId: number;
  affiliateId: number;
  affiliateName: string;
  affiliateEmail: string;
  siteName?: string;
  siteUrl?: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectedBy: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  purchaseAmount: string;
  conversionDate: string;
  amountPaid?: string;
  paymentDate?: string;
}

export interface PaymentStats {
  pending: { count: number; total: string };
  approved: { count: number; total: string };
  rejected: { count: number; total: string };
  completed: { count: number; total: string };
}

export interface AffiliateBalance {
  affiliateId: number;
  affiliateName: string;
  email: string;
  pendingBalance: string;
  totalEarned: string;
}

export interface Commission {
  id: number;
  affiliateId: number;
  conversionId: number;
  amount: string;
  status: string;
  createdAt: string;
}

export interface PaymentsListResponse {
  payments: Payment[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BalancesListResponse {
  balances: AffiliateBalance[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalPending: string;
  };
}

export interface PaymentsParams {
  page?: number;
  limit?: number;
  affiliateId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface BalancesParams {
  page?: number;
  limit?: number;
  affiliateId?: number;
}

export interface CreatePaymentRequest {
  affiliateId: number;
  amount_cents: number;
  notes?: string;
}

export interface MyBalanceResponse {
  affiliateId: number;
  affiliateName: string;
  totalEarned: number | string;
  pendingBalance: number | string;
  completedPayments: number;
  completedAmount: number | string;
  pendingPayments: number;
  pendingAmount: number | string;
  approvedPayments: number;
  approvedAmount: number | string;
  rejectedPayments: number;
  rejectedAmount: number | string;
  totalPaid?: number | string;
  failedPayments?: number;
  failedAmount?: number | string;
  lastPaymentAt?: string | null;
}

export interface PaymentConversionDetails {
  payment: {
    id: number;
    amount: string;
    currency: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    approvedBy: number | null;
    approvedAt: string | null;
    approverName: string | null;
    approverEmail: string | null;
    rejectedBy: number | null;
    rejectedAt: string | null;
    rejectorName: string | null;
    rejectorEmail: string | null;
    rejectionReason: string | null;
    completedAt: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  conversion: {
    id: number;
    date: string;
    purchaseAmount: string;
    currency: string;
    status: 'pending' | 'approved' | 'rejected' | 'chargeback';
    type: string;
    conversionType?: string;
    isTest: boolean;
    customerEmail?: string;
    customerEmailHash: string;
    commissionPercentage: string;
    commissionAmount: string;
    rawPayload: any;
    createdAt: string;
    updatedAt: string;
    metadata: {
      ipAddress: string | null;
      country: string | null;
      city: string | null;
      location: string | null;
      os: string | null;
      osVersion: string | null;
      browser: string | null;
      browserVersion: string | null;
      clickReferrer: string | null;
      landingPage: string | null;
      userAgent: string | null;
    } | null;
  };
  affiliate: {
    id: number;
    userId: number;
    name: string;
    email: string;
    status: 'active' | 'suspended' | 'inactive';
    pendingBalance: string;
    totalEarned: string;
  };
  site: {
    id: number;
    name: string;
    status: 'active' | 'inactive';
  };
  referralCode: {
    id: number;
    code: string;
    isActive: boolean;
  } | null;
}

export const paymentsService = {
  // Get detailed information for a payment or conversion
  getDetails: async (id: number, type: 'payment' | 'conversion' = 'payment'): Promise<PaymentConversionDetails> => {
    const response = await apiClient.get<any>(`/payments/${id}/details?type=${type}`);
    if (isSuccessResponse(response)) {
      return response.data as PaymentConversionDetails;
    }
    throw new Error('Failed to fetch details');
  },
  // Get all payments (Admin/Affiliate)
  getAll: async (params?: PaymentsParams): Promise<PaymentsListResponse> => {
    const searchParams = new URLSearchParams();
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    searchParams.set('page', page.toString());
    searchParams.set('limit', limit.toString());
    if (params?.affiliateId) searchParams.set('affiliateId', params.affiliateId.toString());
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<any>(`/payments${query}`);

    if (isSuccessResponse(response)) {
      const raw = response as any;
      const items: any[] = Array.isArray(raw.data) ? raw.data : (raw.data?.payments || raw.data?.data || []);

      // Map schema fields for compatibility
      const mappedItems = items.map(item => ({
        ...item,
        amountPaid: item.amount || item.amountPaid,
        paymentDate: item.createdAt || item.paymentDate
      }));

      const pagination = raw.pagination || raw.data?.pagination || { page: 1, pageSize: items.length, total: items.length, totalPages: 1, hasNext: false, hasPrev: false };
      return { payments: mappedItems, pagination };
    }
    return { payments: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  },

  // Get single payment
  getById: async (id: number): Promise<Payment | null> => {
    const response = await apiClient.get<Payment>(`/payments/${id}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  // Get payment stats
  getStats: async (affiliateId?: number): Promise<PaymentStats | null> => {
    const query = affiliateId ? `?affiliateId=${affiliateId}` : '';
    const response = await apiClient.get<any>(`/payments/stats${query}`);

    if (isSuccessResponse(response) && response.data) {
      const raw = response.data;

      // Map API response (totalAmount) to frontend interface (total)
      const mapStats = (item: any) => ({
        count: item?.count || 0,
        total: item?.totalAmount || item?.total || '0'
      });

      return {
        pending: mapStats(raw.pending),
        approved: mapStats(raw.approved),
        rejected: mapStats(raw.rejected),
        completed: mapStats(raw.completed)
      };
    }
    return null;
  },

  // Approve a pending payment
  approve: async (id: number, notes?: string): Promise<Payment> => {
    const response = await apiClient.patch<Payment>(`/payments/${id}`, { status: 'approved', notes });
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'APPROVE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to approve payment',
    });
  },

  // Reject a pending payment
  reject: async (id: number, reason: string, notes?: string): Promise<Payment> => {
    const response = await apiClient.patch<Payment>(`/payments/${id}`, { status: 'rejected', reason, notes });
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'REJECT_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to reject payment',
    });
  },

  // Bulk approve payments
  bulkApprove: async (ids: number[]): Promise<{ count: number }> => {
    const response = await apiClient.post<{ count: number }>('/payments/bulk-approve', { ids });
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'BULK_APPROVE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to bulk approve payments',
    });
  },

  // Mark approved payment as completed
  complete: async (id: number, notes?: string): Promise<Payment> => {
    const response = await apiClient.patch<Payment>(`/payments/${id}`, { status: 'completed', notes });
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'COMPLETE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to complete payment',
    });
  },

  // Approve all pending payments
  approveAll: async (affiliateId?: number): Promise<{ count: number }> => {
    const response = await apiClient.post<{ count: number }>('/payments/approve-all', { affiliateId });
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'APPROVE_ALL_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to approve all pending payments',
    });
  },

  // Mark all approved as completed
  settleAll: async (affiliateId?: number): Promise<{ count: number }> => {
    const response = await apiClient.post<{ count: number }>('/payments/settle-all', { affiliateId });
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'SETTLE_ALL_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to settle payments',
    });
  },

  // Create payment (Manual)
  create: async (data: CreatePaymentRequest): Promise<Payment> => {
    const response = await apiClient.post<Payment>('/payments', data);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'CREATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to create payment',
    });
  },

  // Affiliate endpoints
  getMyBalance: async (): Promise<MyBalanceResponse> => {
    const response = await apiClient.get<MyBalanceResponse>('/payments/me/balance');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return {
      affiliateId: 0,
      affiliateName: '',
      totalEarned: '0.00',
      pendingBalance: '0.00',
      completedPayments: 0,
      completedAmount: '0.00',
      pendingPayments: 0,
      pendingAmount: '0.00',
      approvedPayments: 0,
      approvedAmount: '0.00',
      rejectedPayments: 0,
      rejectedAmount: '0.00',
      totalPaid: '0.00',
      failedPayments: 0,
      failedAmount: '0.00',
      lastPaymentAt: null
    };
  },

  getMyPayments: async (params?: PaymentsParams): Promise<PaymentsListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<any>(`/payments/me${query}`);

    if (isSuccessResponse(response)) {
      const raw = response as any;
      const items: any[] = Array.isArray(raw.data) ? raw.data : (raw.data?.payments || raw.data?.data || []);

      const mappedItems = items.map(item => ({
        ...item,
        amountPaid: item.amount || item.amountPaid,
        paymentDate: item.createdAt || item.paymentDate
      }));

      const pagination = raw.pagination || raw.data?.pagination || { page: 1, pageSize: items.length, total: items.length, totalPages: 1, hasNext: false, hasPrev: false };
      return { payments: mappedItems, pagination };
    }
    return { payments: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  },

  getMyCommissions: async (params?: PaymentsParams): Promise<{ commissions: Commission[]; pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<any>(`/payments/me/commissions${query}`);

    if (isSuccessResponse(response)) {
      const raw = response as any;
      const items: Commission[] = Array.isArray(raw.data) ? raw.data : (raw.data?.commissions || raw.data?.data || []);
      const pagination = raw.pagination || raw.data?.pagination || { page: 1, pageSize: items.length, total: items.length, totalPages: 1, hasNext: false, hasPrev: false };
      return { commissions: items, pagination };
    }
    return { commissions: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  },

  search: async (params?: { q?: string; affiliateId?: number; status?: string; limit?: number }): Promise<Payment[]> => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.affiliateId) searchParams.set('affiliateId', params.affiliateId.toString());
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    else searchParams.set('limit', '20');

    const query = searchParams.toString();
    const response = await apiClient.get<Payment[]>(`/payments/search${query ? `?${query}` : ''}`);

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
