import { apiClient, ApiRequestError } from './client';
import { isSuccessResponse, LegacyApiResponse } from './config';

export interface Notification {
  id: number;
  userId?: number;
  type?: string;
  category?: string;
  title?: string;
  message: string;
  data?: any;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications?: Notification[];
  data?: Notification[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    offset?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export const notificationsService = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<NotificationsListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<NotificationsListResponse | Notification[]>(`/notifications${query}`);

    if (isSuccessResponse(response) && response.data) {
      // Handle array response
      if (Array.isArray(response.data)) {
        return {
          notifications: response.data,
          pagination: { page: 1, limit: response.data.length, total: response.data.length, totalPages: 1 }
        };
      }
      // Handle object response with data array
      if (response.data.data && Array.isArray(response.data.data)) {
        return {
          notifications: response.data.data,
          pagination: response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
        };
      }
      // Handle object response with notifications array
      if (response.data.notifications) {
        return response.data;
      }
    }
    return { notifications: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    if (isSuccessResponse(response) && response.data) {
      return response.data.unreadCount;
    }
    return 0;
  },

  markAsRead: async (id: number): Promise<Notification> => {
    const response = await apiClient.patch<Notification>(`/notifications/${id}/read`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    const errorData = response as unknown as Record<string, unknown>;
    throw new ApiRequestError({
      code: (errorData.code as string) || 'UPDATE_FAILED',
      error: (errorData.error as string) || (errorData.message as string) || 'Failed to mark notification as read',
    });
  },

  markAllAsRead: async (): Promise<void> => {
    const response = await apiClient.patch<void>('/notifications/read-all');
    if (!isSuccessResponse(response)) {
      const errorData = response as unknown as Record<string, unknown>;
      throw new ApiRequestError({
        code: (errorData.code as string) || 'UPDATE_FAILED',
        error: (errorData.error as string) || (errorData.message as string) || 'Failed to mark all notifications as read',
      });
    }
  },

  delete: async (id: number): Promise<void> => {
    const response = await apiClient.delete<void>(`/notifications/${id}`);
    if (!isSuccessResponse(response)) {
      const errorData = response as unknown as Record<string, unknown>;
      throw new ApiRequestError({
        code: (errorData.code as string) || 'DELETE_FAILED',
        error: (errorData.error as string) || (errorData.message as string) || 'Failed to delete notification',
      });
    }
  },

  deleteRead: async (): Promise<void> => {
    const response = await apiClient.delete<void>('/notifications/read');
    if (!isSuccessResponse(response)) {
      const errorData = response as unknown as Record<string, unknown>;
      throw new ApiRequestError({
        code: (errorData.code as string) || 'DELETE_FAILED',
        error: (errorData.error as string) || (errorData.message as string) || 'Failed to delete read notifications',
      });
    }
  },
};
