import { Injectable, signal, computed, inject, Injector, effect } from '@angular/core';
import {
  BnplPurchase,
  BnplInstallment,
  BnplProviderId,
  BNPL_PROVIDERS,
} from '../models/bnpl.model';
import { AuthService } from './auth.service';
import { FirebaseService } from '../core/firebase/firebase.service';
import { BcvService } from './bcv.service';
import { NotificationService } from './notification.service';
import { SafeStorage } from '../core/utils/storage.util';
import { FinanceService } from './finance.service';
import { BankSyncService } from './bank-sync.service';

export interface PendingInstallmentItem {
  purchaseId: string;
  providerId: BnplProviderId;
  providerName: string;
  storeName: string;
  itemDescription: string;
  installment: BnplInstallment;
  totalInstallments: number;
  daysRemaining: number;
  isOverdue: boolean;
  isDueSoon: boolean; // within 7 days
}

@Injectable({
  providedIn: 'root',
})
export class BnplService {
  private readonly authService = inject(AuthService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly bcvService = inject(BcvService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);

  readonly providers = signal(BNPL_PROVIDERS);
  readonly purchases = signal<BnplPurchase[]>([]);
  readonly selectedProviderFilter = signal<string>('all');
  readonly isLoading = signal<boolean>(false);

  private unsubscribeSnapshot?: (() => void) | null;

  private getStorageKey(userId?: string): string {
    return `fintrack_bnpl_purchases_${userId || 'guest'}`;
  }

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadPurchasesForUser(user.id);
      } else {
        this.unsubscribeSnapshot?.();
        this.purchases.set([]);
      }
    });
  }

  /**
   * Loads user purchases from Firestore in real-time with fallback to SafeStorage
   */
  private loadPurchasesForUser(userId: string): void {
    this.unsubscribeSnapshot?.();

    // 1. Immediate local cache retrieval
    const cached = SafeStorage.getItem<BnplPurchase[]>(this.getStorageKey(userId), []);
    this.purchases.set(cached);

    if (!this.firebaseService.isBrowser) return;

    // 2. Real-time Firestore subscription
    this.isLoading.set(true);
    this.unsubscribeSnapshot = this.firebaseService.subscribeCollection<BnplPurchase>(
      `users/${userId}/financedPurchases`,
      (items: BnplPurchase[]) => {
        // Sort purchases by createdAt descending
        const sorted = [...items].sort((a: BnplPurchase, b: BnplPurchase) => {
          const dateA = new Date(b.createdAt || b.purchaseDate).getTime();
          const dateB = new Date(a.createdAt || a.purchaseDate).getTime();
          return dateA - dateB;
        });

        this.purchases.set(sorted);
        SafeStorage.setItem(this.getStorageKey(userId), sorted);
        this.isLoading.set(false);
      }
    );
  }

  // Filtered purchases based on selected provider
  readonly filteredPurchases = computed(() => {
    const list = this.purchases();
    const filter = this.selectedProviderFilter();
    if (filter === 'all') return list;
    return list.filter((p) => p.providerId === filter);
  });

  // All pending installments across all active purchases, sorted by due date ascending
  readonly allPendingInstallments = computed<PendingInstallmentItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: PendingInstallmentItem[] = [];

    for (const purchase of this.purchases()) {
      if (purchase.status === 'cancelled') continue;

      for (const inst of purchase.installments) {
        if (inst.status === 'pending') {
          const dueDate = new Date(inst.dueDate + 'T00:00:00');
          const diffMs = dueDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          items.push({
            purchaseId: purchase.id,
            providerId: purchase.providerId,
            providerName: purchase.providerName,
            storeName: purchase.storeName,
            itemDescription: purchase.itemDescription,
            installment: inst,
            totalInstallments: purchase.installmentsCount,
            daysRemaining,
            isOverdue: daysRemaining < 0,
            isDueSoon: daysRemaining >= 0 && daysRemaining <= 7,
          });
        }
      }
    }

    // Sort by due date ascending
    return items.sort((a, b) => a.installment.dueDate.localeCompare(b.installment.dueDate));
  });

  // Installments due in the next 30 days
  readonly upcomingInstallments = computed<PendingInstallmentItem[]>(() => {
    return this.allPendingInstallments().filter((i) => i.daysRemaining <= 30);
  });

  // Next installment closest to due date
  readonly nextDueInstallment = computed<PendingInstallmentItem | null>(() => {
    const list = this.allPendingInstallments();
    return list.length > 0 ? list[0] : null;
  });

  // Total pending debt in USD
  readonly totalPendingDebtUsd = computed<number>(() => {
    return this.allPendingInstallments().reduce((sum, item) => sum + item.installment.amountUsd, 0);
  });

  // Total pending debt in VES calculated with current BCV rate
  readonly totalPendingDebtVes = computed<number>(() => {
    const rate = this.bcvService.dollarRate() || 1;
    return this.totalPendingDebtUsd() * rate;
  });

  // Total debt paid to date (all paid installments + down payments of all active/completed purchases)
  readonly totalPaidDebtUsd = computed<number>(() => {
    let paid = 0;
    for (const p of this.purchases()) {
      if (p.status === 'cancelled') continue;
      paid += p.downPaymentUsd || 0;
      for (const inst of p.installments) {
        if (inst.status === 'paid') {
          paid += inst.amountUsd;
        }
      }
    }
    return paid;
  });

  // Count of active purchases with pending installments
  readonly activePurchasesCount = computed<number>(() => {
    return this.purchases().filter((p) => p.status === 'active').length;
  });

  // Count of overdue installments
  readonly overdueInstallmentsCount = computed<number>(() => {
    return this.allPendingInstallments().filter((i) => i.isOverdue).length;
  });

  /**
   * Helper: Calculates a sequence of biweekly dates (default: every 14 days)
   */
  calculateInstallmentDates(startDateStr: string, count: number, frequencyDays = 14): string[] {
    const dates: string[] = [];
    const baseDate = new Date(startDateStr + 'T00:00:00');

    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i * frequencyDays);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }

    return dates;
  }

  /**
   * Adds a new financed purchase or imports an in-progress debt
   */
  addPurchase(params: {
    providerId: BnplProviderId;
    storeName: string;
    itemDescription: string;
    purchaseDate: string;
    totalAmountUsd: number;
    downPaymentPercent: number;
    installmentsCount: number;
    frequencyDays?: number;
    firstDueDate: string;
    prepaidInstallmentsCount?: number; // for in-progress debts (deudas en curso)
    notes?: string;
  }): BnplPurchase {
    const user = this.authService.currentUser();
    const provider = this.providers().find((p) => p.id === params.providerId) || this.providers()[0];

    const totalUsd = Number(params.totalAmountUsd) || 0;
    const downPercent = Number(params.downPaymentPercent) || 0;
    const downPaymentUsd = Number(((totalUsd * downPercent) / 100).toFixed(2));
    const financedUsd = Number((totalUsd - downPaymentUsd).toFixed(2));
    const count = Number(params.installmentsCount) || 3;
    const freqDays = Number(params.frequencyDays) || 14;

    const installmentAmount = Number((financedUsd / count).toFixed(2));
    const dates = this.calculateInstallmentDates(params.firstDueDate, count, freqDays);

    const prepaidCount = Math.min(count, Math.max(0, Number(params.prepaidInstallmentsCount) || 0));

    const installments: BnplInstallment[] = dates.map((dueDate, idx) => {
      const isPrepaid = idx < prepaidCount;
      return {
        number: idx + 1,
        dueDate,
        amountUsd: installmentAmount,
        status: isPrepaid ? 'paid' : 'pending',
        paidAt: isPrepaid ? new Date().toISOString() : undefined,
      };
    });

    const isAllPaid = installments.every((i) => i.status === 'paid');

    const newPurchase: BnplPurchase = {
      id: `bnpl_${params.providerId}_${Date.now()}`,
      userId: user?.id,
      providerId: params.providerId,
      providerName: provider.name,
      storeName: params.storeName.trim(),
      itemDescription: params.itemDescription.trim(),
      purchaseDate: params.purchaseDate,
      currency: 'USD',
      totalAmountUsd: totalUsd,
      downPaymentPercent: downPercent,
      downPaymentUsd,
      financedAmountUsd: financedUsd,
      installmentsCount: count,
      frequencyDays: freqDays,
      firstDueDate: params.firstDueDate,
      status: isAllPaid ? 'completed' : 'active',
      notes: params.notes?.trim() || undefined,
      installments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.purchases.update((list) => {
      const updated = [newPurchase, ...list];
      SafeStorage.setItem(this.getStorageKey(user?.id), updated);
      return updated;
    });

    if (user && this.firebaseService.isBrowser) {
      this.firebaseService.setSubDoc(
        `users/${user.id}/financedPurchases`,
        newPurchase.id,
        newPurchase as unknown as Record<string, unknown>
      );
    }

    this.notificationService.sendNotification(
      'Compra Financiada Registrada',
      `Se agregó ${newPurchase.itemDescription} (${provider.name}) en ${newPurchase.storeName}. Monto financiado: $${financedUsd.toFixed(2)} en ${count} cuotas quincenales.`,
      'system',
      'credit_score'
    );

    return newPurchase;
  }

  /**
   * Marks a specific installment as paid, with optional debit from a bank account
   */
  async markInstallmentPaid(
    purchaseId: string,
    installmentNumber: number,
    options?: {
      accountId?: string;
      paidDate?: string;
    }
  ): Promise<void> {
    const user = this.authService.currentUser();
    const purchase = this.purchases().find((p) => p.id === purchaseId);
    if (!purchase) return;

    const installment = purchase.installments.find((i) => i.number === installmentNumber);
    if (!installment || installment.status === 'paid') return;

    const paidAt = options?.paidDate || new Date().toISOString().slice(0, 10);
    let linkedTxId: string | undefined;
    let selectedAccountName: string | undefined;

    // If an account was provided, register an expense transaction and debit the account
    if (options?.accountId) {
      try {
        const bankSyncService = this.injector.get(BankSyncService);
        const financeService = this.injector.get(FinanceService);

        const targetAccount = bankSyncService.accounts().find((a) => a.id === options.accountId);
        if (targetAccount) {
          selectedAccountName = `${targetAccount.bankName} - ${targetAccount.name}`;
          const dollarRate = this.bcvService.dollarRate() || 1;

          // If bank account is in USD, debit USD directly; if in VES, debit equivalent in VES
          const isUsdAccount = targetAccount.currency === 'USD';
          const vesAmount = Number((installment.amountUsd * dollarRate).toFixed(2));
          const debitAmount = isUsdAccount ? installment.amountUsd : vesAmount;

          // 1. Add expense transaction
          const newTx = financeService.addTransaction({
            type: 'expense',
            amount: vesAmount,
            amountUsd: installment.amountUsd,
            exchangeRate: dollarRate,
            currency: targetAccount.currency || 'VES',
            categoryId: 'cat_shopping',
            categoryName: 'Compras & Financiamientos',
            categoryIcon: 'shopping_bag',
            categoryColor: '#eab308',
            date: paidAt,
            description: `Pago Cuota #${installmentNumber}/${purchase.installmentsCount} ${purchase.providerName} - ${purchase.itemDescription}`,
            accountId: targetAccount.id,
            accountName: selectedAccountName,
            status: 'cleared',
            notes: `Pago de cuota quincenal en ${purchase.storeName}`,
          });

          linkedTxId = newTx.id;

          // 2. Update account balance
          const newBalance = targetAccount.balance - debitAmount;
          bankSyncService.updateAccountBalance(targetAccount.id, newBalance);
        }
      } catch (err) {
        console.warn('Error debiting account for BNPL installment:', err);
      }
    }

    const updatedInstallments = purchase.installments.map((inst) => {
      if (inst.number === installmentNumber) {
        return {
          ...inst,
          status: 'paid' as const,
          paidAt: new Date().toISOString(),
          transactionId: linkedTxId,
          accountId: options?.accountId,
          accountName: selectedAccountName,
        };
      }
      return inst;
    });

    const allPaid = updatedInstallments.every((i) => i.status === 'paid');

    const updatedPurchase: BnplPurchase = {
      ...purchase,
      status: allPaid ? 'completed' : 'active',
      installments: updatedInstallments,
      updatedAt: new Date().toISOString(),
    };

    this.purchases.update((list) => {
      const updated = list.map((p) => (p.id === purchaseId ? updatedPurchase : p));
      SafeStorage.setItem(this.getStorageKey(user?.id), updated);
      return updated;
    });

    if (user && this.firebaseService.isBrowser) {
      this.firebaseService.updateSubDoc(
        `users/${user.id}/financedPurchases`,
        purchaseId,
        updatedPurchase as unknown as Record<string, unknown>
      );
    }

    this.notificationService.sendNotification(
      'Cuota Pagada con Éxito',
      `Cuota #${installmentNumber} de ${purchase.itemDescription} ($${installment.amountUsd.toFixed(2)}) marcada como pagada.${allPaid ? ' ¡Felicitaciones! Has completado el pago total de esta compra.' : ''}`,
      'system',
      'check_circle'
    );
  }

  /**
   * Deletes a purchase record from local state and Firestore
   */
  deletePurchase(purchaseId: string): void {
    const user = this.authService.currentUser();
    this.purchases.update((list) => {
      const updated = list.filter((p) => p.id !== purchaseId);
      SafeStorage.setItem(this.getStorageKey(user?.id), updated);
      return updated;
    });

    if (user && this.firebaseService.isBrowser) {
      this.firebaseService.deleteSubDoc(`users/${user.id}/financedPurchases`, purchaseId);
    }

    this.notificationService.sendNotification(
      'Registro Eliminado',
      'La compra financiada ha sido eliminada del control de deudas.',
      'system',
      'delete'
    );
  }
}
