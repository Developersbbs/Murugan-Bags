import axiosInstance from "@/helpers/axiosInstance";
import { Notification } from "@/types/api";
import { getCurrentUser } from "@/services/auth";

export async function fetchNotifications({ staffId }: { staffId: string }): Promise<Notification[]> {
  try {
    const { data } = await axiosInstance.get(`/api/notifications?staffId=${staffId}`);
    
    if (!data.success) {
      console.error('Error fetching notifications:', data.error);
      throw new Error(data.error || 'Failed to fetch notifications');
    }

    return data.data || [];
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch notifications');
  }
}

export async function deleteNotification({ notificationId }: { notificationId: string }) {
  try {
    const { data } = await axiosInstance.delete(`/api/notifications/${notificationId}`);
    
    if (!data.success) {
      console.error('Error deleting notification:', data.error);
      throw new Error('Could not dismiss the notification.');
    }

    return;
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    throw new Error(error.response?.data?.error || 'Could not dismiss the notification.');
  }
}

export async function fetchNotificationsCount({ staffId }: { staffId: string }): Promise<number> {
  try {
    const { data } = await axiosInstance.get(`/api/notifications/count?staffId=${staffId}`);
    
    if (!data.success) {
      console.error('Error fetching notification count:', data.error);
      throw new Error('Could not fetch notification count.');
    }

    return data.data || 0;
  } catch (error: any) {
    console.error('Error fetching notification count:', error);
    throw new Error(error.response?.data?.error || 'Could not fetch notification count.');
  }
}
