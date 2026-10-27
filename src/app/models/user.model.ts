export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  pushNotificationsEnabled: boolean;
  budgetAlertsEnabled: boolean;
  bankSyncFrequency: 'instant' | 'daily' | 'manual';
  currency: string; // e.g. "EUR" or "USD"
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  totalMonthlyBudget: number;
  preferences: UserPreferences;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}
