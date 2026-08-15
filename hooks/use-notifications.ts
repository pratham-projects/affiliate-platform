import { useState, useCallback } from 'react';
import { type Notification } from '@/lib/api/notifications';

export function useNotifications() {
  const [notifications] = useState<Notification[]>([]);
  const [unreadCount] = useState(0);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const markAsRead = useCallback(async (_id: number) => {
    // Disabled for now
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Disabled for now
  }, []);

  const deleteNotification = useCallback(async (_id: number) => {
    // Disabled for now
  }, []);

  const refresh = useCallback(async () => {
    // Disabled for now
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
}
