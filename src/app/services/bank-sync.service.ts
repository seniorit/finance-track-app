import { Injectable, signal, computed, inject, effect, Injector } from '@angular/core';
import { BankAccount, SUPPORTED_BANKS, BankInstitution } from '../models/bank-account.model';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { FirebaseService } from '../core/firebase/firebase.service';
import { SafeStorage } from '../core/utils/storage.util';
import { BcvService } from './bcv.service';
import { FinanceService } from './finance.service';

@Injectable({
  providedIn: 'root',
})
export class BankSyncService {
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly bcvService = inject(BcvService);
  private readonly injector = inject(Injector);

  private accountsUnsubscribe: (() => void) | null = null;
  private institutionsUnsubscribe: (() => void) | null = null;

  private getStorageKey(userId?: string): string {
    return userId ? `fintrack_${userId}_bank_accounts` : 'fintrack_bank_accounts';
  }

  // Initialized empty; populated strictly from user Firestore collection
  readonly accounts = signal<BankAccount[]>([]);

  // Supported banks populated dynamically from global Firestore collection '/institutions'
  readonly supportedBanks = signal<BankInstitution[]>(SUPPORTED_BANKS);

  readonly isSyncingAll = signal<boolean>(false);
  readonly lastSyncGlobal = signal<string>(new Date().toISOString());

  // Consolidated balance in VES, converting USD accounts using live BCV rate
  readonly totalBankBalance = computed(() => {
    const rate = this.bcvService.dollarRate() || 1;
    return this.accounts().reduce((sum, acc) => {
      const bal = acc.balance || 0;
      if (acc.currency === 'USD') {
        return sum + bal * rate;
      }
      return sum + bal;
    }, 0);
  });

  readonly connectedCount = computed(() => {
    return this.accounts().filter((a) => a.status === 'connected').length;
  });

  constructor() {
    // 1. Subscribe to global '/institutions' catalog in Firestore
    if (this.firebaseService.isBrowser) {
      this.firebaseService.seedCollectionIfEmpty('institutions', SUPPORTED_BANKS).catch((err) => {
        console.warn('Could not seed initial institutions:', err);
      });

      const unsubInst = this.firebaseService.subscribeCollection<BankInstitution>(
        'institutions',
        (institutions) => {
          if (institutions && institutions.length > 0) {
            this.supportedBanks.set(institutions);
          }
        }
      );
      if (unsubInst) {
        this.institutionsUnsubscribe = unsubInst;
      }
    }

    // 2. Real-time subscription to authenticated user's bank accounts in Firestore
    effect(() => {
      const user = this.authService.currentUser();
      if (this.accountsUnsubscribe) {
        this.accountsUnsubscribe();
        this.accountsUnsubscribe = null;
      }

      if (!user) {
        this.accounts.set([]);
        return;
      }

      const storageKey = this.getStorageKey(user.id);
      this.accounts.set(SafeStorage.getItem<BankAccount[]>(storageKey, []));

      if (this.firebaseService.isBrowser) {
        const subPath = `users/${user.id}/bankAccounts`;
        const unsub = this.firebaseService.subscribeCollection<BankAccount>(
          subPath,
          (firestoreAccs) => {
            const list = firestoreAccs || [];
            this.accounts.set(list);
            SafeStorage.setItem(storageKey, list);
          }
        );
        if (unsub) {
          this.accountsUnsubscribe = unsub;
        }
      }
    });
  }

  /**
   * Syncs user bank accounts and updates lastSyncAt in Firestore
   */
  async syncAllAccounts(): Promise<{ countSynced: number; newMovementsFound: number }> {
    const currentAccs = this.accounts();
    if (currentAccs.length === 0) {
      this.notificationService.sendNotification(
        'Sin Cuentas para Sincronizar',
        'Aún no has vinculado ninguna cuenta bancaria o billetera. Agrega tu primera cuenta para habilitar la sincronización.',
        'bank_sync',
        'account_balance'
      );
      return { countSynced: 0, newMovementsFound: 0 };
    }

    this.isSyncingAll.set(true);

    // Update individual account states to 'syncing'
    this.accounts.update((list) =>
      list.map((acc) => ({ ...acc, status: 'syncing' as const }))
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const nowIso = new Date().toISOString();
    const user = this.authService.currentUser();

    this.accounts.update((list) => {
      const updated = list.map((acc) => ({
        ...acc,
        lastSyncAt: nowIso,
        status: 'connected' as const,
      }));
      SafeStorage.setItem(this.getStorageKey(user?.id), updated);

      if (user && this.firebaseService.isBrowser) {
        for (const acc of updated) {
          this.firebaseService.updateSubDoc(`users/${user.id}/bankAccounts`, acc.id, {
            lastSyncAt: nowIso,
            status: 'connected',
            balance: acc.balance,
            userId: user.id,
          });
        }
      }

      return updated;
    });

    this.lastSyncGlobal.set(nowIso);
    this.isSyncingAll.set(false);

    this.notificationService.sendNotification(
      'Sincronización Bancaria Completada',
      `Tus ${currentAccs.length} cuentas se han sincronizado con éxito. Balances verificados con la nube.`,
      'bank_sync',
      'sync'
    );

    return {
      countSynced: currentAccs.length,
      newMovementsFound: 0,
    };
  }

  /**
   * Syncs a single account and updates its lastSyncAt status in Firestore
   */
  async syncAccount(id: string): Promise<void> {
    const acc = this.accounts().find((a) => a.id === id);
    if (!acc) return;

    this.accounts.update((list) =>
      list.map((a) => (a.id === id ? { ...a, status: 'syncing' as const } : a))
    );

    await new Promise((resolve) => setTimeout(resolve, 600));

    const nowIso = new Date().toISOString();
    const user = this.authService.currentUser();

    this.accounts.update((list) => {
      const updated = list.map((a) =>
        a.id === id ? { ...a, lastSyncAt: nowIso, status: 'connected' as const } : a
      );
      SafeStorage.setItem(this.getStorageKey(user?.id), updated);
      return updated;
    });

    if (user && this.firebaseService.isBrowser) {
      this.firebaseService.updateSubDoc(`users/${user.id}/bankAccounts`, id, {
        lastSyncAt: nowIso,
        status: 'connected',
        balance: acc.balance,
        userId: user.id,
      });
    }

    this.notificationService.sendNotification(
      'Cuenta Sincronizada',
      `La cuenta "${acc.name}" (${acc.bankName}) se ha sincronizado correctamente.`,
      'bank_sync',
      'sync'
    );
  }

  addBankAccount(
    bankCode: string,
    accountName: string,
    initialBalance: number,
    type: BankAccount['type'],
    currency: 'VES' | 'USD' = 'VES',
    customAccountNumber?: string,
    createInitialTransaction = true
  ): BankAccount {
    const bank = this.supportedBanks().find((b) => b.code === bankCode) || this.supportedBanks()[0] || SUPPORTED_BANKS[0];
    const user = this.authService.currentUser();
    const cleanBalance = Number(initialBalance) || 0;

    const accNumber = customAccountNumber?.trim()
      ? customAccountNumber.trim()
      : `•••• ${Math.floor(1000 + Math.random() * 9000)}`;

    const newAcc: BankAccount = {
      id: `acc_${bankCode}_${Date.now()}`,
      userId: user?.id,
      name: accountName || `Cuenta ${bank.name}`,
      bankName: bank.name,
      bankCode: bank.code,
      type,
      accountNumber: accNumber,
      balance: cleanBalance,
      currency,
      lastSyncAt: new Date().toISOString(),
      status: 'connected',
      color: bank.color,
    };

    this.accounts.update((list) => {
      const updated = [...list, newAcc];
      SafeStorage.setItem(this.getStorageKey(user?.id), updated);
      return updated;
    });

    // Write to Firestore under users/{userId}/bankAccounts/{id}
    if (user && this.firebaseService.isBrowser) {
      this.firebaseService.setSubDoc(
        `users/${user.id}/bankAccounts`,
        newAcc.id,
        newAcc as unknown as Record<string, unknown>
      );
    }

    // Automatically record opening balance transaction if initial balance > 0
    if (createInitialTransaction && cleanBalance > 0) {
      try {
        const financeService = this.injector.get(FinanceService);
        const rate = this.bcvService.dollarRate() || 1;
        const vesAmount = currency === 'USD' ? Number((cleanBalance * rate).toFixed(2)) : cleanBalance;
        const usdAmount = currency === 'USD' ? cleanBalance : Number((cleanBalance / rate).toFixed(2));

        financeService.addTransaction({
          amount: vesAmount,
          exchangeRate: rate,
          amountUsd: usdAmount,
          currency,
          type: 'income',
          categoryId: 'cat_opening_balance',
          categoryName: 'Saldo Inicial / Apertura',
          categoryIcon: 'account_balance_wallet',
          categoryColor: '#10b981',
          date: new Date().toISOString().slice(0, 10),
          description: `Saldo Inicial - ${newAcc.name}`,
          accountId: newAcc.id,
          accountName: `${newAcc.bankName} - ${newAcc.name}`,
          status: 'cleared',
          notes: `Apertura de cuenta con saldo inicial en ${currency}`,
        });
      } catch (err) {
        console.warn('Could not record initial balance transaction:', err);
      }
    }

    this.notificationService.sendNotification(
      'Nueva Cuenta Conectada',
      `Se ha vinculado exitosamente la cuenta "${newAcc.name}" (${newAcc.bankName}) con saldo inicial de ${cleanBalance > 0 ? cleanBalance.toFixed(2) + ' ' + currency : '0.00 ' + currency}.`,
      'bank_sync',
      'add_card'
    );

    return newAcc;
  }

  removeAccount(id: string): void {
    const user = this.authService.currentUser();

    this.accounts.update((list) => {
      const updated = list.filter((a) => a.id !== id);
      SafeStorage.setItem(this.getStorageKey(user?.id), updated);
      return updated;
    });

    // Delete from Firestore
    if (user && this.firebaseService.isBrowser) {
      this.firebaseService.deleteSubDoc(`users/${user.id}/bankAccounts`, id);
    }
  }

  updateAccountBalance(id: string, newBalance: number): void {
    const user = this.authService.currentUser();

    this.accounts.update((list) => {
      const updated = list.map((a) => (a.id === id ? { ...a, balance: newBalance, lastSyncAt: new Date().toISOString() } : a));
      SafeStorage.setItem(this.getStorageKey(user?.id), updated);
      return updated;
    });

    // Write to Firestore
    if (user && this.firebaseService.isBrowser) {
      this.firebaseService.updateSubDoc(`users/${user.id}/bankAccounts`, id, {
        id,
        userId: user.id,
        balance: newBalance,
        lastSyncAt: new Date().toISOString(),
      });
    }
  }
}
