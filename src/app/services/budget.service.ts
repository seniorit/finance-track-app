import { Injectable, signal, computed, inject } from '@angular/core';
import { Budget, BudgetAlert, AlertSeverity } from '../models/budget.model';
import { NotificationService } from './notification.service';
import { SafeStorage } from '../core/utils/storage.util';

const DEFAULT_BUDGETS: Budget[] = [
  {
    id: 'b_food',
    categoryId: 'cat_food',
    categoryName: 'Alimentación',
    categoryColor: '#f59e0b',
    categoryIcon: 'restaurant',
    monthlyLimit: 550,
    period: 'monthly',
    notifyAtPercent: [75, 90, 100],
  },
  {
    id: 'b_housing',
    categoryId: 'cat_housing',
    categoryName: 'Vivienda y Servicios',
    categoryColor: '#3b82f6',
    categoryIcon: 'home',
    monthlyLimit: 950,
    period: 'monthly',
    notifyAtPercent: [75, 90, 100],
  },
  {
    id: 'b_transport',
    categoryId: 'cat_transport',
    categoryName: 'Transporte',
    categoryColor: '#6366f1',
    categoryIcon: 'directions_car',
    monthlyLimit: 220,
    period: 'monthly',
    notifyAtPercent: [75, 90, 100],
  },
  {
    id: 'b_entertainment',
    categoryId: 'cat_entertainment',
    categoryName: 'Entretenimiento',
    categoryColor: '#ec4899',
    categoryIcon: 'sports_esports',
    monthlyLimit: 180,
    period: 'monthly',
    notifyAtPercent: [75, 90, 100],
  },
  {
    id: 'b_shopping',
    categoryId: 'cat_shopping',
    categoryName: 'Compras',
    categoryColor: '#10b981',
    categoryIcon: 'shopping_bag',
    monthlyLimit: 250,
    period: 'monthly',
    notifyAtPercent: [75, 90, 100],
  },
];

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private readonly notificationService = inject(NotificationService);
  private readonly STORAGE_BUDGETS_KEY = 'fintrack_budgets';
  private readonly STORAGE_ALERTS_KEY = 'fintrack_budget_alerts';

  readonly budgets = signal<Budget[]>(
    SafeStorage.getItem<Budget[]>(this.STORAGE_BUDGETS_KEY, DEFAULT_BUDGETS)
  );

  readonly alerts = signal<BudgetAlert[]>(
    SafeStorage.getItem<BudgetAlert[]>(this.STORAGE_ALERTS_KEY, [
      {
        id: 'al_sample_1',
        budgetId: 'b_food',
        categoryId: 'cat_food',
        categoryName: 'Alimentación',
        categoryIcon: 'restaurant',
        spent: 478.50,
        limit: 550,
        percentage: 87,
        thresholdTriggered: 75,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        read: false,
        severity: 'warning',
      },
    ])
  );

  readonly totalBudgetLimit = computed(() => {
    return this.budgets().reduce((acc, b) => acc + b.monthlyLimit, 0);
  });

  readonly unreadAlertsCount = computed(() => {
    return this.alerts().filter((a) => !a.read).length;
  });

  /**
   * Evaluates category spending and automatically dispatches alerts when thresholds are reached
   */
  evaluateSpending(categorySpentMap: Record<string, number>): void {
    const currentBudgets = this.budgets();
    const currentAlerts = [...this.alerts()];
    let alertCreated = false;

    currentBudgets.forEach((budget) => {
      const spent = categorySpentMap[budget.categoryId] || 0;
      const percentage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;

      // Determine highest triggered threshold
      let thresholdToTrigger = 0;
      let severity: AlertSeverity = 'info';

      if (percentage >= 100) {
        thresholdToTrigger = 100;
        severity = 'danger';
      } else if (percentage >= 90) {
        thresholdToTrigger = 90;
        severity = 'warning';
      } else if (percentage >= 75) {
        thresholdToTrigger = 75;
        severity = 'info';
      }

      if (thresholdToTrigger > 0) {
        // Check if an alert for this budget & threshold was already triggered in the last 24h
        const recentAlert = currentAlerts.find(
          (a) =>
            a.budgetId === budget.id &&
            a.thresholdTriggered === thresholdToTrigger &&
            Date.now() - new Date(a.createdAt).getTime() < 86400000
        );

        if (!recentAlert) {
          const newAlert: BudgetAlert = {
            id: `alert_${budget.id}_${Date.now()}`,
            budgetId: budget.id,
            categoryId: budget.categoryId,
            categoryName: budget.categoryName,
            categoryIcon: budget.categoryIcon,
            spent,
            limit: budget.monthlyLimit,
            percentage: Math.round(percentage),
            thresholdTriggered: thresholdToTrigger,
            createdAt: new Date().toISOString(),
            read: false,
            severity,
          };

          currentAlerts.unshift(newAlert);
          alertCreated = true;

          // Dispatch Push Notification
          const title =
            thresholdToTrigger >= 100
              ? `¡Presupuesto Superado en ${budget.categoryName}!`
              : `Alerta: ${thresholdToTrigger}% de Presupuesto en ${budget.categoryName}`;

          const body =
            thresholdToTrigger >= 100
              ? `Has gastado ${spent.toFixed(2)} € superando el límite fijado de ${budget.monthlyLimit.toFixed(2)} €.`
              : `Has alcanzado ${spent.toFixed(2)} € (${Math.round(percentage)}%) de tu límite de ${budget.monthlyLimit.toFixed(2)} €.`;

          this.notificationService.sendNotification(title, body, 'budget_alert', 'warning');
        }
      }
    });

    if (alertCreated) {
      this.alerts.set(currentAlerts);
      SafeStorage.setItem(this.STORAGE_ALERTS_KEY, currentAlerts.slice(0, 30));
    }
  }

  setBudget(categoryId: string, categoryName: string, categoryColor: string, categoryIcon: string, monthlyLimit: number): void {
    this.budgets.update((list) => {
      const idx = list.findIndex((b) => b.categoryId === categoryId);
      let updated: Budget[];
      if (idx >= 0) {
        updated = list.map((b, i) =>
          i === idx ? { ...b, monthlyLimit } : b
        );
      } else {
        const newBudget: Budget = {
          id: `b_${categoryId}_${Date.now()}`,
          categoryId,
          categoryName,
          categoryColor,
          categoryIcon,
          monthlyLimit,
          period: 'monthly',
          notifyAtPercent: [75, 90, 100],
        };
        updated = [...list, newBudget];
      }
      SafeStorage.setItem(this.STORAGE_BUDGETS_KEY, updated);
      return updated;
    });

    this.notificationService.sendNotification(
      'Presupuesto Actualizado',
      `Se ha fijado un límite de ${monthlyLimit.toFixed(2)} € para ${categoryName}.`,
      'system',
      'price_check'
    );
  }

  deleteBudget(id: string): void {
    this.budgets.update((list) => {
      const updated = list.filter((b) => b.id !== id);
      SafeStorage.setItem(this.STORAGE_BUDGETS_KEY, updated);
      return updated;
    });
  }

  markAlertAsRead(id: string): void {
    this.alerts.update((list) => {
      const updated = list.map((a) => (a.id === id ? { ...a, read: true } : a));
      SafeStorage.setItem(this.STORAGE_ALERTS_KEY, updated);
      return updated;
    });
  }

  clearAllAlerts(): void {
    this.alerts.set([]);
    SafeStorage.setItem(this.STORAGE_ALERTS_KEY, []);
  }
}
