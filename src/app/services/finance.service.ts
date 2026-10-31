import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Transaction, Category, DEFAULT_CATEGORIES } from '../models/transaction.model';
import { BankSyncService } from './bank-sync.service';
import { BudgetService } from './budget.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { FirebaseService } from '../core/firebase/firebase.service';
import { SafeStorage } from '../core/utils/storage.util';
import { BcvService } from './bcv.service';

@Injectable({
  providedIn: 'root',
})
export class FinanceService {
  private readonly bankSyncService = inject(BankSyncService);
  private readonly budgetService = inject(BudgetService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly firebaseService = inject(FirebaseService);
  readonly bcvService = inject(BcvService);
  private txUnsubscribe: (() => void) | null = null;
  private catUnsubscribe: (() => void) | null = null;

  private readonly STORAGE_CAT_KEY = 'fintrack_categories';

  private getStorageKey(userId?: string): string {
    return userId ? `fintrack_${userId}_transactions` : 'fintrack_transactions';
  }

  // Categories loaded dynamically from global Firestore collection '/categories'
  readonly categories = signal<Category[]>(
    SafeStorage.getItem<Category[]>(this.STORAGE_CAT_KEY, DEFAULT_CATEGORIES)
  );

  // Initialized empty; populated strictly from the authenticated user's Firestore subcollection
  readonly transactions = signal<Transaction[]>([]);

  // Search & Filters state
  readonly searchQuery = signal<string>('');
  readonly selectedTypeFilter = signal<'all' | 'expense' | 'income'>('all');
  readonly selectedCategoryFilter = signal<string>('all');
  readonly selectedAccountFilter = signal<string>('all');

  // Computed Totals
  readonly totalIncome = computed(() => {
    return this.transactions()
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  });

  readonly totalExpense = computed(() => {
    return this.transactions()
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  });

  readonly netBalance = computed(() => {
    return this.totalIncome() - this.totalExpense();
  });

  readonly savingsRate = computed(() => {
    const inc = this.totalIncome();
    if (inc <= 0) return 0;
    const rate = ((inc - this.totalExpense()) / inc) * 100;
    return Math.max(0, Math.round(rate));
  });

  // Current Month Category Breakdown
  readonly expensesByCategory = computed(() => {
    const txs = this.transactions().filter((t) => t.type === 'expense');
    const totalExp = this.totalExpense();
    const map = new Map<string, { category: Category; amount: number; count: number }>();

    for (const tx of txs) {
      const cat =
        this.categories().find((c) => c.id === tx.categoryId) || {
          id: tx.categoryId,
          name: tx.categoryName || 'Otro',
          icon: 'category',
          color: '#94a3b8',
          type: 'expense' as const,
        };

      const existing = map.get(cat.id);
      if (existing) {
        existing.amount += tx.amount;
        existing.count += 1;
      } else {
        map.set(cat.id, { category: cat, amount: tx.amount, count: 1 });
      }
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: totalExp > 0 ? (item.amount / totalExp) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  });

  // Category spent map for budget checking
  readonly categorySpentMap = computed(() => {
    const map: Record<string, number> = {};
    for (const item of this.expensesByCategory()) {
      map[item.category.id] = item.amount;
    }
    return map;
  });

  // Monthly Cash Flow data (last 6 months) calculated strictly from real user transactions
  readonly monthlyHistory = computed(() => {
    const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const result: { month: string; income: number; expense: number }[] = [];
    const txs = this.transactions();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthLabel = monthsNames[monthIdx];

      const monthTxs = txs.filter((t) => {
        if (!t.date) return false;
        const txDate = new Date(t.date);
        return txDate.getFullYear() === year && txDate.getMonth() === monthIdx;
      });

      const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      result.push({
        month: monthLabel,
        income,
        expense,
      });
    }

    return result;
  });

  // Filtered transactions for UI presentation
  readonly filteredTransactions = computed(() => {
    let list = this.transactions();

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(query) ||
          (t.categoryName && t.categoryName.toLowerCase().includes(query)) ||
          (t.accountName && t.accountName.toLowerCase().includes(query)) ||
          (t.notes && t.notes.toLowerCase().includes(query))
      );
    }

    const typeFilter = this.selectedTypeFilter();
    if (typeFilter !== 'all') {
      list = list.filter((t) => t.type === typeFilter);
    }

    const catFilter = this.selectedCategoryFilter();
    if (catFilter !== 'all') {
      list = list.filter((t) => t.categoryId === catFilter);
    }

    const accFilter = this.selectedAccountFilter();
    if (accFilter !== 'all') {
      list = list.filter((t) => t.accountId === accFilter);
    }

    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  constructor() {
    // 1. Subscribe to global '/categories' catalog in Firestore
    if (this.firebaseService.isBrowser) {
      this.firebaseService.seedCollectionIfEmpty('categories', DEFAULT_CATEGORIES).catch((err) => {
        console.warn('Could not seed initial categories:', err);
      });

      const unsubCat = this.firebaseService.subscribeCollection<Category>(
        'categories',
        (cats) => {
          if (cats && cats.length > 0) {
            this.categories.set(cats);
            SafeStorage.setItem(this.STORAGE_CAT_KEY, cats);
          }
        }
      );
      if (unsubCat) {
        this.catUnsubscribe = unsubCat;
      }
    }

    // 2. Whenever spending changes, trigger budget threshold evaluations
    effect(() => {
      const spentMap = this.categorySpentMap();
      this.budgetService.evaluateSpending(spentMap);
    });

    // 3. Firestore user transactions real-time synchronization
    effect(() => {
      const user = this.authService.currentUser();
      if (this.txUnsubscribe) {
        this.txUnsubscribe();
        this.txUnsubscribe = null;
      }

      if (!user) {
        this.transactions.set([]);
        return;
      }

      const storageKey = this.getStorageKey(user.id);
      this.transactions.set(SafeStorage.getItem<Transaction[]>(storageKey, []));

      if (this.firebaseService.isBrowser) {
        const subPath = `users/${user.id}/transactions`;
        const unsub = this.firebaseService.subscribeCollection<Transaction>(
          subPath,
          (firestoreTxs) => {
            const list = firestoreTxs || [];
            this.transactions.set(list);
            SafeStorage.setItem(storageKey, list);
          }
        );
        if (unsub) {
          this.txUnsubscribe = unsub;
        }
      }
    });
  }

  addTransaction(txData: Omit<Transaction, 'id'>): Transaction {
    const cat = this.categories().find((c) => c.id === txData.categoryId);
    const acc = this.bankSyncService.accounts().find((a) => a.id === txData.accountId);
    const user = this.authService.currentUser();
    const rate = txData.exchangeRate && txData.exchangeRate > 0 ? txData.exchangeRate : this.bcvService.dollarRate();
    const amountUsd = txData.amountUsd !== undefined ? txData.amountUsd : Number((txData.amount / (rate || 1)).toFixed(2));

    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user?.id,
      amount: txData.amount,
      exchangeRate: rate,
      amountUsd,
      currency: txData.currency || 'VES',
      categoryName: cat?.name || 'Varios',
      categoryIcon: cat?.icon || 'payments',
      categoryColor: cat?.color || '#64748b',
      accountName: acc ? `${acc.bankName} - ${acc.name}` : 'Cuenta General',
    };

    // Update transactions list in state
    this.transactions.update((list) => {
      const updated = [newTx, ...list];
      SafeStorage.setItem(this.getStorageKey(user?.id), updated);
      return updated;
    });

    // Write to Firestore under users/{userId}/transactions/{id}
    if (user && this.firebaseService.isBrowser) {
      this.firebaseService.setSubDoc(
        `users/${user.id}/transactions`,
        newTx.id,
        newTx as unknown as Record<string, unknown>
      );
    }

    // Update account balance
    if (acc) {
      const adjustment = newTx.type === 'income' ? newTx.amount : -newTx.amount;
      this.bankSyncService.updateAccountBalance(acc.id, acc.balance + adjustment);
    }

    // Trigger instant alert if expense is large (>= 1500 Bs.)
    if (newTx.type === 'expense' && newTx.amount >= 1500) {
      this.notificationService.sendNotification(
        'Gasto Significativo Detectado',
        `Registrado gasto de Bs. ${newTx.amount.toFixed(2)} (≈ $${amountUsd.toFixed(2)}) en ${newTx.categoryName}.`,
        'transaction',
        'receipt_long'
      );
    }

    return newTx;
  }

  updateTransaction(id: string, partial: Partial<Transaction>): void {
    const cat = partial.categoryId ? this.categories().find((c) => c.id === partial.categoryId) : undefined;
    const acc = partial.accountId ? this.bankSyncService.accounts().find((a) => a.id === partial.accountId) : undefined;
    const user = this.authService.currentUser();

    this.transactions.update((list) => {
      const updated = list.map((t) => {
        if (t.id !== id) return t;
        const newAmount = partial.amount !== undefined ? partial.amount : t.amount;
        const newRate = partial.exchangeRate !== undefined ? partial.exchangeRate : (t.exchangeRate || this.bcvService.dollarRate());
        const newAmountUsd = partial.amountUsd !== undefined 
          ? partial.amountUsd 
          : Number((newAmount / (newRate || 1)).toFixed(2));

        return {
          ...t,
          ...partial,
          amount: newAmount,
          exchangeRate: newRate,
          amountUsd: newAmountUsd,
          currency: partial.currency || t.currency || 'VES',
          categoryName: cat ? cat.name : (partial.categoryName ?? t.categoryName),
          categoryIcon: cat ? cat.icon : (partial.categoryIcon ?? t.categoryIcon),
          categoryColor: cat ? cat.color : (partial.categoryColor ?? t.categoryColor),
          accountName: acc ? `${acc.bankName} - ${acc.name}` : (partial.accountName ?? t.accountName),
        };
      });
      SafeStorage.setItem(this.getStorageKey(user?.id), updated);
      return updated;
    });

    // Write to Firestore
    if (user && this.firebaseService.isBrowser) {
      const payload: Record<string, unknown> = {
        ...partial,
        id,
        userId: user.id,
      };
      if (cat) {
        payload['categoryName'] = cat.name;
        payload['categoryIcon'] = cat.icon;
        payload['categoryColor'] = cat.color;
      }
      if (acc) {
        payload['accountName'] = `${acc.bankName} - ${acc.name}`;
      }
      this.firebaseService.updateSubDoc(
        `users/${user.id}/transactions`,
        id,
        payload
      );
    }
  }

  deleteTransaction(id: string): void {
    const user = this.authService.currentUser();

    this.transactions.update((list) => {
      const updated = list.filter((t) => t.id !== id);
      SafeStorage.setItem(this.getStorageKey(user?.id), updated);
      return updated;
    });

    // Delete from Firestore
    if (user && this.firebaseService.isBrowser) {
      this.firebaseService.deleteSubDoc(`users/${user.id}/transactions`, id);
    }
  }

  importBankMovement(accountId: string, desc: string, amount: number, type: 'expense' | 'income', categoryId: string): void {
    this.addTransaction({
      amount,
      type,
      categoryId,
      date: new Date().toISOString().slice(0, 10),
      description: desc,
      accountId,
      status: 'cleared',
      notes: 'Importado automáticamente vía Open Banking',
    });
  }
}
