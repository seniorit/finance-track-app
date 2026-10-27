import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Transaction, Category, DEFAULT_CATEGORIES } from '../models/transaction.model';
import { BankSyncService } from './bank-sync.service';
import { BudgetService } from './budget.service';
import { NotificationService } from './notification.service';
import { SafeStorage } from '../core/utils/storage.util';

// Helper to generate dates relative to today
const getDateDaysAgo = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_seed_1',
    amount: 2850.00,
    type: 'income',
    categoryId: 'cat_salary',
    categoryName: 'Nómina / Salario',
    categoryIcon: 'payments',
    categoryColor: '#10b981',
    date: getDateDaysAgo(2),
    description: 'Nómina Mensual - Tech Solutions SL',
    accountId: 'acc_bbva_1',
    accountName: 'BBVA Cuenta Nómina',
    status: 'cleared',
    isRecurring: true,
  },
  {
    id: 'tx_seed_2',
    amount: 142.30,
    type: 'expense',
    categoryId: 'cat_food',
    categoryName: 'Alimentación',
    categoryIcon: 'restaurant',
    categoryColor: '#f59e0b',
    date: getDateDaysAgo(1),
    description: 'Compra Semanal Mercadona Supermercado',
    accountId: 'acc_bbva_1',
    accountName: 'BBVA Cuenta Nómina',
    status: 'cleared',
    notes: 'Víveres y productos frescos',
  },
  {
    id: 'tx_seed_3',
    amount: 850.00,
    type: 'expense',
    categoryId: 'cat_housing',
    categoryName: 'Vivienda y Servicios',
    categoryIcon: 'home',
    categoryColor: '#3b82f6',
    date: getDateDaysAgo(4),
    description: 'Alquiler Residencia Mensual',
    accountId: 'acc_bbva_1',
    accountName: 'BBVA Cuenta Nómina',
    status: 'cleared',
    isRecurring: true,
  },
  {
    id: 'tx_seed_4',
    amount: 45.00,
    type: 'expense',
    categoryId: 'cat_transport',
    categoryName: 'Transporte',
    categoryIcon: 'directions_car',
    categoryColor: '#6366f1',
    date: getDateDaysAgo(2),
    description: 'Recarga Gasolina Repsol Express',
    accountId: 'acc_santander_2',
    accountName: 'Santander Smart',
    status: 'cleared',
  },
  {
    id: 'tx_seed_5',
    amount: 68.50,
    type: 'expense',
    categoryId: 'cat_entertainment',
    categoryName: 'Entretenimiento',
    categoryIcon: 'sports_esports',
    categoryColor: '#ec4899',
    date: getDateDaysAgo(3),
    description: 'Cena Restaurante La Tagliatella',
    accountId: 'acc_santander_2',
    accountName: 'Santander Smart',
    status: 'cleared',
  },
  {
    id: 'tx_seed_6',
    amount: 17.99,
    type: 'expense',
    categoryId: 'cat_utilities',
    categoryName: 'Suscripciones y Luz',
    categoryIcon: 'bolt',
    categoryColor: '#eab308',
    date: getDateDaysAgo(5),
    description: 'Suscripción Netflix & Spotify Premium',
    accountId: 'acc_revolut_3',
    accountName: 'Revolut Viajes',
    status: 'cleared',
    isRecurring: true,
  },
  {
    id: 'tx_seed_7',
    amount: 320.00,
    type: 'income',
    categoryId: 'cat_freelance',
    categoryName: 'Trabajos Extra / Freelance',
    categoryIcon: 'laptop_mac',
    categoryColor: '#0284c7',
    date: getDateDaysAgo(6),
    description: 'Diseño Web Landing Page Cliente Freelance',
    accountId: 'acc_revolut_3',
    accountName: 'Revolut Viajes',
    status: 'cleared',
  },
  {
    id: 'tx_seed_8',
    amount: 115.00,
    type: 'expense',
    categoryId: 'cat_shopping',
    categoryName: 'Compras',
    categoryIcon: 'shopping_bag',
    categoryColor: '#10b981',
    date: getDateDaysAgo(7),
    description: 'Ropa Temporada Zara & Calzado',
    accountId: 'acc_santander_2',
    accountName: 'Santander Smart',
    status: 'cleared',
  },
  {
    id: 'tx_seed_9',
    amount: 48.00,
    type: 'expense',
    categoryId: 'cat_health',
    categoryName: 'Salud y Bienestar',
    categoryIcon: 'favorite',
    categoryColor: '#ef4444',
    date: getDateDaysAgo(8),
    description: 'Farmacia & Suplementos Vitaminas',
    accountId: 'acc_cash_4',
    accountName: 'Efectivo',
    status: 'cleared',
  },
  {
    id: 'tx_seed_10',
    amount: 88.20,
    type: 'expense',
    categoryId: 'cat_food',
    categoryName: 'Alimentación',
    categoryIcon: 'restaurant',
    categoryColor: '#f59e0b',
    date: getDateDaysAgo(9),
    description: 'Supermercado Carrefour Express',
    accountId: 'acc_bbva_1',
    accountName: 'BBVA Cuenta Nómina',
    status: 'cleared',
  },
  {
    id: 'tx_seed_11',
    amount: 65.00,
    type: 'expense',
    categoryId: 'cat_utilities',
    categoryName: 'Suscripciones y Luz',
    categoryIcon: 'bolt',
    categoryColor: '#eab308',
    date: getDateDaysAgo(11),
    description: 'Factura Fibra Óptica 1Gbps',
    accountId: 'acc_bbva_1',
    accountName: 'BBVA Cuenta Nómina',
    status: 'cleared',
    isRecurring: true,
  },
  {
    id: 'tx_seed_12',
    amount: 180.00,
    type: 'expense',
    categoryId: 'cat_food',
    categoryName: 'Alimentación',
    categoryIcon: 'restaurant',
    categoryColor: '#f59e0b',
    date: getDateDaysAgo(14),
    description: 'Cena Fin de Semana Amigos Asador',
    accountId: 'acc_santander_2',
    accountName: 'Santander Smart',
    status: 'cleared',
  },
];

@Injectable({
  providedIn: 'root',
})
export class FinanceService {
  private readonly bankSyncService = inject(BankSyncService);
  private readonly budgetService = inject(BudgetService);
  private readonly notificationService = inject(NotificationService);

  private readonly STORAGE_TX_KEY = 'fintrack_transactions';
  private readonly STORAGE_CAT_KEY = 'fintrack_categories';

  readonly categories = signal<Category[]>(
    SafeStorage.getItem<Category[]>(this.STORAGE_CAT_KEY, DEFAULT_CATEGORIES)
  );

  readonly transactions = signal<Transaction[]>(
    SafeStorage.getItem<Transaction[]>(this.STORAGE_TX_KEY, SEED_TRANSACTIONS)
  );

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

  // Monthly Cash Flow data (last 6 months) for statistical charts
  readonly monthlyHistory = computed(() => {
    const months = ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'];
    // Seed with realistic progressive trend plus current month actuals
    const history = [
      { month: months[0], income: 2700, expense: 1650 },
      { month: months[1], income: 2800, expense: 1720 },
      { month: months[2], income: 2950, expense: 1890 },
      { month: months[3], income: 2750, expense: 1580 },
      { month: months[4], income: 3100, expense: 1940 },
      { month: months[5], income: this.totalIncome(), expense: this.totalExpense() },
    ];
    return history;
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
    // Whenever spending changes, trigger budget threshold evaluations
    effect(() => {
      const spentMap = this.categorySpentMap();
      this.budgetService.evaluateSpending(spentMap);
    });
  }

  addTransaction(txData: Omit<Transaction, 'id'>): Transaction {
    const cat = this.categories().find((c) => c.id === txData.categoryId);
    const acc = this.bankSyncService.accounts().find((a) => a.id === txData.accountId);

    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      categoryName: cat?.name || 'Varios',
      categoryIcon: cat?.icon || 'payments',
      categoryColor: cat?.color || '#64748b',
      accountName: acc ? `${acc.bankName} - ${acc.name}` : 'Cuenta General',
    };

    // Update transactions list
    this.transactions.update((list) => {
      const updated = [newTx, ...list];
      SafeStorage.setItem(this.STORAGE_TX_KEY, updated);
      return updated;
    });

    // Update account balance
    if (acc) {
      const adjustment = newTx.type === 'income' ? newTx.amount : -newTx.amount;
      this.bankSyncService.updateAccountBalance(acc.id, acc.balance + adjustment);
    }

    // Trigger instant alert if expense is large
    if (newTx.type === 'expense' && newTx.amount >= 300) {
      this.notificationService.sendNotification(
        'Gasto Significativo Detectado',
        `Registrado gasto de ${newTx.amount.toFixed(2)} € en ${newTx.categoryName}.`,
        'transaction',
        'receipt_long'
      );
    }

    return newTx;
  }

  updateTransaction(id: string, partial: Partial<Transaction>): void {
    const cat = partial.categoryId ? this.categories().find((c) => c.id === partial.categoryId) : undefined;
    const acc = partial.accountId ? this.bankSyncService.accounts().find((a) => a.id === partial.accountId) : undefined;

    this.transactions.update((list) => {
      const updated = list.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          ...partial,
          categoryName: cat ? cat.name : (partial.categoryName ?? t.categoryName),
          categoryIcon: cat ? cat.icon : (partial.categoryIcon ?? t.categoryIcon),
          categoryColor: cat ? cat.color : (partial.categoryColor ?? t.categoryColor),
          accountName: acc ? `${acc.bankName} - ${acc.name}` : (partial.accountName ?? t.accountName),
        };
      });
      SafeStorage.setItem(this.STORAGE_TX_KEY, updated);
      return updated;
    });
  }

  deleteTransaction(id: string): void {
    this.transactions.update((list) => {
      const updated = list.filter((t) => t.id !== id);
      SafeStorage.setItem(this.STORAGE_TX_KEY, updated);
      return updated;
    });
  }

  /**
   * Imports a new simulated transaction discovered from bank synchronization
   */
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
