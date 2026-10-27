export type NotificationType = 'budget_alert' | 'bank_sync' | 'transaction' | 'system';

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: NotificationType;
  icon?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}
