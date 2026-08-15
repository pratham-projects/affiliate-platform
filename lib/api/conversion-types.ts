import { apiClient, ApiRequestError } from './client';
import { isSuccessResponse } from './config';

export interface ConversionType {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversionTypesListResponse {
  conversionTypes: ConversionType[];
}

export interface CreateConversionTypeRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateConversionTypeRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export const conversionTypesService = {
  getAll: async (): Promise<ConversionType[]> => {
    const response = await apiClient.get<ConversionType[] | { conversionTypes?: ConversionType[]; data?: ConversionType[] }>('/conversion-types');
    if (isSuccessResponse(response)) {
      const raw = response as any;
      const items = Array.isArray(raw.data)
        ? raw.data
        : raw.data?.conversionTypes || raw.data?.data || [];
      return items;
    }
    return [];
  },

  getById: async (id: number): Promise<ConversionType | null> => {
    const response = await apiClient.get<ConversionType>(`/conversion-types/${id}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  create: async (data: CreateConversionTypeRequest): Promise<ConversionType> => {
    const response = await apiClient.post<ConversionType>('/conversion-types', data);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }

    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'CREATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to create conversion type',
      status: (errorData.status as number) || 400,
    });
  },

  update: async (id: number, data: UpdateConversionTypeRequest): Promise<ConversionType> => {
    const response = await apiClient.patch<ConversionType>(`/conversion-types/${id}`, data);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }

    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UPDATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to update conversion type',
      status: (errorData.status as number) || 400,
    });
  },

  delete: async (id: number): Promise<boolean> => {
    const response = await apiClient.delete(`/conversion-types/${id}`);
    if (isSuccessResponse(response)) {
      return true;
    }

    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'DELETE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to delete conversion type',
      status: (errorData.status as number) || 400,
    });
  },

  assignToAffiliate: async (affiliateId: number, conversionTypeIds: number[]): Promise<ConversionType[]> => {
    const response = await apiClient.patch<ConversionType[]>(`/affiliates/${affiliateId}/conversion-types`, {
      conversionTypeIds,
    });

    if (isSuccessResponse(response)) {
      const raw = response as any;
      if (Array.isArray(raw.data)) {
        return raw.data;
      }
      if (Array.isArray(raw.data?.conversionTypes)) {
        return raw.data.conversionTypes;
      }
      return [];
    }

    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UPDATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to update affiliate conversion types',
      status: (errorData.status as number) || 400,
    });
  },
};
