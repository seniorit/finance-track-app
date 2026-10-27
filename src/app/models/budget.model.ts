export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  monthlyLimit: number;
  period: 'monthly';
  notifyAtPercent: number[]; // e.g. [75, 90, 100]
}

export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface BudgetAlert {
  id: string;
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  spent: number;
  limit: number;
  percentage: number;
  thresholdTriggered: number; // e.g. 90 or 100
  createdAt: string;
  read: boolean;
  severity: AlertSeverity;
}
