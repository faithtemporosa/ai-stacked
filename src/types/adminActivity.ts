/**
 * Type definitions for admin activity logs
 */

export interface AdminActivityLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_user_id: string | null;
  details: AdminActivityDetails;
  created_at: string;
}

export interface AdminActivityDetails {
  role?: string;
  automation_id?: string;
  user_email?: string;
  [key: string]: unknown;
}
