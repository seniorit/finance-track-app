import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Budget, BudgetAlert, AlertSeverity } from '../models/budget.model';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { FirebaseService } from '../core/firebase/firebase.service';
import { SafeStorage } from '../core/utils/storage.util';

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly firebaseService = inject(FirebaseService);
  private budgetUnsubscribe: (() => void) | null = null;

  private getBudgetStorageKey(userId?: string): string {
    return userId ? `fintrack_${userId}_budgets` : 'fintrack_budgets';
  }

  private getAlertStorageKey(userId?: string): string {
    return userId ? `fintrack_${userId}_alerts` : 'fintrack_alerts';
  }

  // Initialized empty; populated strictly according to the active user session from Firestore
  readonly budgets = signal<Budget[]>([]);
  readonly alerts = signal<BudgetAlert[]>([]);

  readonly totalBudgetLimit = computed(() => {
    return this.budgets().reduce((acc, b) => acc + b.monthlyLimit, 0);
  });

  readonly unreadAlertsCount = computed(() => {
    return this.alerts().filter((a) => !a.read).length;
  });

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (this.budgetUnsubscribe) {
        this.budgetUnsubscribe();
        this.budgetUnsubscribe = null;
      }

      if (!user) {
        this.budgets.set([]);
        this.alerts.set([]);
        return;
      }

      const budgetKey = this.getBudgetStorageKey(user.id);
      const alertKey = this.getAlertStorageKey(user.id);

      this.budgets.set(SafeStorage.getItem<Budget[]>(budgetKey, []));
      this.alerts.set(SafeStorage.getItem<BudgetAlert[]>(alertKey, []));

      if (this.firebaseService.isBrowser) {
        const subPath = `users/${user.id}/budgets`;
        const unsub = this.firebaseService.subscribeCollection<Budget>(
          subPath,
          (firestoreBudgets) => {
            const list = firestoreBudgets || [];
            this.budgets.set(list);
            SafeStorage.setItem(budgetKey, list);
          }
        );
        if (unsub) {
          this.budgetUnsubscribe = unsub;
        }
      }
    });
  }

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
              ? `Has gastado ${spent.toFixed(2)} Bs. superando el límite fijado de ${budget.monthlyLimit.toFixed(2)} Bs.`
              : `Has alcanzado ${spent.toFixed(2)} Bs. (${Math.round(percentage)}%) de tu límite de ${budget.monthlyLimit.toFixed(2)} Bs.`;

          this.notificationService.sendNotification(title, body, 'budget_alert', 'warning');
        }
      }
    });

    if (alertCreated) {
      const user = this.authService.currentUser();
      this.alerts.set(currentAlerts);
      SafeStorage.setItem(this.getAlertStorageKey(user?.id), currentAlerts.slice(0, 30));
    }
  }

  setBudget(categoryId: string, categoryName: string, categoryColor: string, categoryIcon: string, monthlyLimit: number): void {
    const user = this.authService.currentUser();
    let savedBudget: Budget | null = null;

    this.budgets.update((list) => {
      const idx = list.findIndex((b) => b.categoryId === categoryId);
      let updated: Budget[];
      if (idx >= 0) {
        updated = list.map((b, i) => {
          if (i === idx) {
            savedBudget = { ...b, monthlyLimit, userId: user?.id };
            return savedBudget;
          }
          return b;
        });
      } else {
        const newBudget: Budget = {
          id: `b_${categoryId}_${Date.now()}`,
          userId: user?.id,
          categoryId,
          categoryName,
          categoryColor,
          categoryIcon,
          monthlyLimit,
          period: 'monthly',
          notifyAtPercent: [75, 90, 100],
        };
        savedBudget = newBudget;
        updated = [...list, newBudget];
      }
      SafeStorage.setItem(this.getBudgetStorageKey(user?.id), updated);
      return updated;
    });

    // Write to Firestore under users/{userId}/budgets/{id}
    if (user && savedBudget && this.firebaseService.isBrowser) {
      const b = savedBudget as Budget;
      this.firebaseService.setSubDoc(
        `users/${user.id}/budgets`,
        b.id,
        b as unknown as Record<string, unknown>
      );
    }

    this.notificationService.sendNotification(
      'Presupuesto Actualizado',
      `Se ha fijado un límite de ${monthlyLimit.toFixed(2)} Bs. para ${categoryName}.`,
      'system',
      'price_check'
    );
  }

  deleteBudget(id: string): void {
    const user = this.authService.currentUser();

    this.budgets.update((list) => {
      const updated = list.filter((b) => b.id !== id);
      SafeStorage.setItem(this.getBudgetStorageKey(user?.id), updated);
      return updated;
    });

    // Delete from Firestore
    if (user && this.firebaseService.isBrowser) {
      this.firebaseService.deleteSubDoc(`users/${user.id}/budgets`, id);
    }
  }

  markAlertAsRead(id: string): void {
    const user = this.authService.currentUser();
    this.alerts.update((list) => {
      const updated = list.map((a) => (a.id === id ? { ...a, read: true } : a));
      SafeStorage.setItem(this.getAlertStorageKey(user?.id), updated);
      return updated;
    });
  }

  clearAllAlerts(): void {
    const user = this.authService.currentUser();
    this.alerts.set([]);
    SafeStorage.setItem(this.getAlertStorageKey(user?.id), []);
  }
}
