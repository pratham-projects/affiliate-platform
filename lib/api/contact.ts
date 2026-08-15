import { apiClient, ApiRequestError } from './client';
import { isSuccessResponse } from './config';

export type ContactRequestType = 'general_inquiry' | 'technical_support' | 'account_issue';
export type ContactRequestStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

export interface ContactRequest {
    id: number;
    affiliateId: number;
    affiliateName?: string;
    affiliateEmail?: string;
    subject: string;
    message: string;
    requestType: ContactRequestType;
    amount: string | null;
    currency: string; // Added currency field
    status: ContactRequestStatus;
    adminNotes: string | null;
    createdAt: string;
    updatedAt: string | null;
    resolvedAt: string | null;
}

export interface CreateContactRequest {
    subject: string;
    message: string;
    requestType: ContactRequestType;
    amount?: number;
    currency?: string; // Added optional currency field
}

export interface UpdateContactStatusRequest {
    status: ContactRequestStatus;
    adminNotes?: string;
}

export interface ContactRequestsListResponse {
    data: ContactRequest[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ContactRequestsParams {
    page?: number;
    limit?: number;
    status?: string;
    requestType?: string;
}

export const contactService = {
    // Affiliate: submit a new contact/support request
    submit: async (data: CreateContactRequest): Promise<ContactRequest> => {
        const response = await apiClient.post<ContactRequest>('/contact', data);
        // apiClient returns raw JSON: { status, message, data: ContactRequest }
        const raw = response as any;
        if ((raw.status === 'success' || raw.success) && raw.data) {
            return raw.data;
        }
        throw new ApiRequestError({
            code: 'SUBMIT_FAILED',
            message: (response as any).message || 'Failed to submit request',
        });
    },

    // Affiliate: get my own requests
    getMyRequests: async (params?: ContactRequestsParams): Promise<ContactRequestsListResponse> => {
        const searchParams = new URLSearchParams();
        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const offset = (page - 1) * limit;
        searchParams.set('offset', offset.toString());
        searchParams.set('limit', limit.toString());

        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        const raw = await apiClient.get<any>(`/contact/my-requests${query}`) as any;
        if (raw?.status === 'success' || raw?.success) {
            const items = Array.isArray(raw.data) ? raw.data : (raw.data?.data || raw.data?.requests || []);
            const pagination = raw.pagination || raw.data?.pagination || { page: page, limit: limit, total: items.length, totalPages: 1 };
            return { data: items, pagination };
        }
        return { data: [], pagination: { page: page, limit: limit, total: 0, totalPages: 0 } };
    },

    // Admin: get all requests with filters
    getAll: async (params?: ContactRequestsParams): Promise<ContactRequestsListResponse> => {
        const searchParams = new URLSearchParams();
        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const offset = (page - 1) * limit;
        searchParams.set('offset', offset.toString());
        searchParams.set('limit', limit.toString());
        if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
        if (params?.requestType && params.requestType !== 'all') searchParams.set('requestType', params.requestType);

        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        const raw = await apiClient.get<any>(`/contact${query}`) as any;
        if (raw?.status === 'success' || raw?.success) {
            const items = Array.isArray(raw.data) ? raw.data : (raw.data?.data || raw.data?.requests || []);
            const pagination = raw.pagination || raw.data?.pagination || { page: page, limit: limit, total: items.length, totalPages: 1 };
            return { data: items, pagination };
        }
        return { data: [], pagination: { page: page, limit: limit, total: 0, totalPages: 0 } };
    },

    // Admin: update request status (and optionally add notes)
    updateStatus: async (id: number, data: UpdateContactStatusRequest): Promise<ContactRequest> => {
        const raw = await apiClient.patch<any>(`/contact/${id}/status`, data) as any;
        if (raw?.status === 'success' && raw.data) {
            return raw.data;
        }
        throw new ApiRequestError({
            code: 'UPDATE_FAILED',
            message: raw?.message || 'Failed to update request status',
        });
    },

    // Admin: delete a request
    delete: async (id: number): Promise<boolean> => {
        const response = await apiClient.delete(`/contact/${id}`);
        return isSuccessResponse(response);
    },
};
