import { apiClient, ApiRequestError } from './client';
import { isSuccessResponse, LegacyApiResponse } from './config';

// Plan Assignment Types
export interface PlanAssignment {
  id: number;
  affiliateId: number;
  affiliateName: string;
  planId: number;
  planName: string;
  customCommissionOverride: string | null;
  customDurationOverride: 'one_month' | 'lifetime' | 'x_months' | null;
  customDurationMonths: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanAssignmentRequest {
  affiliateId: number;
  planId: number;
  customCommissionOverride?: string;
  customDurationOverride?: 'one_month' | 'lifetime' | 'x_months';
  customDurationMonths?: number;
}

export interface UpdatePlanAssignmentRequest {
  customCommissionOverride?: string;
  customDurationOverride?: 'one_month' | 'lifetime' | 'x_months';
  customDurationMonths?: number;
}

export interface EffectiveCommission {
  affiliateId: number;
  planId: number;
  effectiveCommission: string;
  durationType: string;
  durationMonths: number | null;
  source: 'custom' | 'plan';
}

// Site Assignment Types
export interface SiteAssignment {
  id: number;
  affiliateId: number;
  affiliateName: string;
  siteId: number;
  siteName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSiteAssignmentRequest {
  affiliateId: number;
  siteId: number;
}

export interface PlanAssignmentsResponse {
  assignments: PlanAssignment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SiteAssignmentsResponse {
  assignments: SiteAssignment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const assignmentsService = {
  // Plan Assignments
  getPlanAssignments: async (params?: { page?: number; limit?: number; affiliateId?: number; planId?: number; isActive?: boolean }): Promise<PlanAssignmentsResponse> => {
    const searchParams = new URLSearchParams();
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    searchParams.set('offset', offset.toString());
    searchParams.set('limit', limit.toString());
    if (params?.affiliateId) searchParams.set('affiliateId', params.affiliateId.toString());
    if (params?.planId) searchParams.set('planId', params.planId.toString());
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());

    const query = `?${searchParams.toString()}`;
    const response = await apiClient.get<PlanAssignment[] | { assignments: PlanAssignment[]; pagination: any }>(`/assignments/plans${query}`);
    if (isSuccessResponse(response)) {
      const raw = response as any;
      const items: PlanAssignment[] = Array.isArray(raw.data) ? raw.data : (raw.data?.assignments || []);
      const pagination = raw.pagination || { page: 1, limit: items.length, total: items.length, totalPages: 1 };
      return { assignments: items, pagination };
    }
    return { assignments: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  },

  getPlanAssignmentById: async (id: number): Promise<PlanAssignment | null> => {
    const response = await apiClient.get<PlanAssignment>(`/assignments/plans/${id}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  createPlanAssignment: async (data: CreatePlanAssignmentRequest): Promise<PlanAssignment> => {
    const payload = {
      affiliate_id: data.affiliateId,
      plan_id: data.planId,
      custom_commission_override: data.customCommissionOverride,
      custom_duration_override: data.customDurationOverride,
      custom_duration_months: data.customDurationMonths
    };
    const response = await apiClient.post<PlanAssignment>('/assignments/plans', payload);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'CREATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to assign plan',
    });
  },

  updatePlanAssignment: async (id: number, data: UpdatePlanAssignmentRequest): Promise<PlanAssignment> => {
    const payload = {
      ...(data.customCommissionOverride !== undefined && { custom_commission_override: data.customCommissionOverride }),
      ...(data.customDurationOverride !== undefined && { custom_duration_override: data.customDurationOverride }),
      ...(data.customDurationMonths !== undefined && { custom_duration_months: data.customDurationMonths }),
    };
    const response = await apiClient.patch<PlanAssignment>(`/assignments/plans/${id}`, payload);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UPDATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to update assignment',
    });
  },

  togglePlanAssignment: async (id: number): Promise<PlanAssignment> => {
    const response = await apiClient.patch<PlanAssignment>(`/assignments/plans/${id}/toggle`, {});
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'TOGGLE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to toggle assignment',
    });
  },

  deletePlanAssignment: async (affiliateId: number, planId: number): Promise<boolean> => {
    const response = await apiClient.delete(`/assignments/plans/${affiliateId}/${planId}`);
    if (isSuccessResponse(response)) {
      return true;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'DELETE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to remove assignment',
    });
  },

  getEffectiveCommission: async (id: number): Promise<EffectiveCommission | null> => {
    const response = await apiClient.get<EffectiveCommission>(`/assignments/plans/${id}/effective-commission`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  // Site Assignments
  getSiteAssignments: async (params?: { page?: number; limit?: number; affiliateId?: number; siteId?: number; isActive?: boolean }): Promise<SiteAssignmentsResponse> => {
    const searchParams = new URLSearchParams();
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    searchParams.set('offset', offset.toString());
    searchParams.set('limit', limit.toString());
    if (params?.affiliateId) searchParams.set('affiliateId', params.affiliateId.toString());
    if (params?.siteId) searchParams.set('siteId', params.siteId.toString());
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());

    const query = `?${searchParams.toString()}`;
    const response = await apiClient.get<SiteAssignment[] | { assignments: SiteAssignment[]; pagination: any }>(`/assignments/sites${query}`);
    if (isSuccessResponse(response)) {
      const raw = response as any;
      const items: SiteAssignment[] = Array.isArray(raw.data) ? raw.data : (raw.data?.assignments || []);
      const pagination = raw.pagination || { page: 1, limit: items.length, total: items.length, totalPages: 1 };
      return { assignments: items, pagination };
    }
    return { assignments: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  },

  createSiteAssignment: async (data: CreateSiteAssignmentRequest): Promise<SiteAssignment> => {
    const payload = {
      affiliate_id: data.affiliateId,
      site_id: data.siteId
    };
    const response = await apiClient.post<SiteAssignment>('/assignments/sites', payload);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'CREATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to assign site',
    });
  },

  toggleSiteAssignment: async (id: number): Promise<SiteAssignment> => {
    const response = await apiClient.patch<SiteAssignment>(`/assignments/sites/${id}/toggle`, {});
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'TOGGLE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to toggle site assignment',
    });
  },

  deleteSiteAssignment: async (affiliateId: number, siteId: number): Promise<boolean> => {
    const response = await apiClient.delete(`/assignments/sites/${affiliateId}/${siteId}`);
    if (isSuccessResponse(response)) {
      return true;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'DELETE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to remove site assignment',
    });
  },
};
