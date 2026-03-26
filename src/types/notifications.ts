/**
 * Type definitions for notifications
 */

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link: string | null;
  created_at: string;
}

export type NotificationType = 
  | 'wishlist_update'
  | 'new_feature'
  | 'recommendation'
  | 'order_update'
  | 'role_change'
  | 'system';
