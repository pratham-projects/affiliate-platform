import { apiClient } from './client';
import { isSuccessResponse } from './config';

export interface Plan {
  id: number;
  planName: string;
  baseCommissionPercentage: string;
  commissionDurationType: 'one_month' | 'lifetime' | 'x_months';
  durationMonths: number | null;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanRequest {
  plan_name: string;
  base_commission_percentage: string;
  commission_duration_type: 'one_month' | 'lifetime' | 'x_months';
  duration_months?: number;
  description?: string;
  is_active?: boolean;
}

export interface UpdatePlanRequest {
  plan_name?: string;
  base_commission_percentage?: string;
  commission_duration_type?: 'one_month' | 'lifetime' | 'x_months';
  duration_months?: number;
  description?: string;
  is_active?: boolean;
}

export interface PlansListResponse {
  plans: Plan[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const plansService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PlansListResponse> => {
    const searchParams = new URLSearchParams();
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    searchParams.set('offset', offset.toString());
    searchParams.set('limit', limit.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<Plan[] | PlansListResponse>(`/plans${query}`);
    if (isSuccessResponse(response)) {
      const raw = response as any;
      const items: Plan[] = Array.isArray(raw.data) ? raw.data : (raw.data?.plans || []);
      const pagination = raw.pagination || { page: 1, limit: items.length, total: items.length, totalPages: 1 };
      return { plans: items, pagination };
    }
    return { plans: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
  },

  getById: async (id: number): Promise<Plan | null> => {
    const response = await apiClient.get<Plan>(`/plans/${id}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getByName: async (name: string): Promise<Plan | null> => {
    const response = await apiClient.get<Plan>(`/plans/name/${encodeURIComponent(name)}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getDefaultCurrent: async (): Promise<Plan | null> => {
    const response = await apiClient.get<Plan>('/plans/default/current');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  create: async (data: CreatePlanRequest): Promise<Plan | null> => {
    const response = await apiClient.post<Plan>('/plans', data);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  update: async (id: number, data: UpdatePlanRequest): Promise<Plan | null> => {
    const response = await apiClient.patch<Plan>(`/plans/${id}`, data);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  delete: async (id: number): Promise<boolean> => {
    const response = await apiClient.delete(`/plans/${id}`);
    return isSuccessResponse(response);
  },

  toggle: async (id: number): Promise<Plan | null> => {
    const response = await apiClient.patch<Plan>(`/plans/${id}/toggle`, {});
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  setDefault: async (id: number): Promise<Plan | null> => {
    const response = await apiClient.patch<Plan>(`/plans/${id}/set-default`, {});
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },
};
