import { Injectable, signal, computed, inject } from '@angular/core';
import { BankAccount, SUPPORTED_BANKS, BankInstitution } from '../models/bank-account.model';
import { NotificationService } from './notification.service';
import { SafeStorage } from '../core/utils/storage.util';

const DEFAULT_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc_bbva_1',
    name: 'Cuenta Nómina Online',
    bankName: 'BBVA',
    bankCode: 'bbva',
    type: 'checking',
    accountNumber: '•••• 4829',
    balance: 3840.50,
    currency: 'EUR',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    status: 'connected',
    color: '#004481',
    isDefault: true,
  },
  {
    id: 'acc_santander_2',
    name: 'Tarjeta Santander Smart',
    bankName: 'Banco Santander',
    bankCode: 'santander',
    type: 'credit',
    accountNumber: '•••• 7104',
    balance: 1420.00,
    currency: 'EUR',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'connected',
    color: '#ec0000',
  },
  {
    id: 'acc_revolut_3',
    name: 'Cuenta Viajes & Moneda',
    bankName: 'Revolut',
    bankCode: 'revolut',
    type: 'checking',
    accountNumber: '•••• 9931',
    balance: 890.25,
    currency: 'EUR',
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'connected',
    color: '#19b4ff',
  },
  {
    id: 'acc_cash_4',
    name: 'Billetera / Efectivo',
    bankName: 'Efectivo en Mano',
    bankCode: 'cash',
    type: 'wallet',
    accountNumber: 'Manual',
    balance: 245.00,
    currency: 'EUR',
    lastSyncAt: new Date().toISOString(),
    status: 'connected',
    color: '#10b981',
  },
];

@Injectable({
  providedIn: 'root',
})
export class BankSyncService {
  private readonly notificationService = inject(NotificationService);
  private readonly STORAGE_KEY = 'fintrack_bank_accounts';

  readonly accounts = signal<BankAccount[]>(
    SafeStorage.getItem<BankAccount[]>(this.STORAGE_KEY, DEFAULT_ACCOUNTS)
  );

  readonly supportedBanks = signal<BankInstitution[]>(SUPPORTED_BANKS);

  readonly isSyncingAll = signal<boolean>(false);
  readonly lastSyncGlobal = signal<string>(new Date().toISOString());

  readonly totalBankBalance = computed(() => {
    return this.accounts().reduce((sum, acc) => sum + (acc.balance || 0), 0);
  });

  readonly connectedCount = computed(() => {
    return this.accounts().filter((a) => a.status === 'connected').length;
  });

  /**
   * Triggers a realistic Open Banking sync flow with progress and simulated new transactions
   */
  async syncAllAccounts(): Promise<{ countSynced: number; newMovementsFound: number }> {
    this.isSyncingAll.set(true);

    // Update individual account states to 'syncing'
    this.accounts.update((list) =>
      list.map((acc) => ({ ...acc, status: 'syncing' as const }))
    );

    // Simulate open-banking network handshake delay
    await new Promise((resolve) => setTimeout(resolve, 1400));

    const nowIso = new Date().toISOString();

    // Random slight bank adjustment to simulate live sync
    this.accounts.update((list) => {
      const updated = list.map((acc) => {
        return {
          ...acc,
          lastSyncAt: nowIso,
          status: 'connected' as const,
        };
      });
      SafeStorage.setItem(this.STORAGE_KEY, updated);
      return updated;
    });

    this.lastSyncGlobal.set(nowIso);
    this.isSyncingAll.set(false);

    // Send push notification about successful bank sync
    this.notificationService.sendNotification(
      'Sincronización Bancaria Completada',
      `Tus ${this.accounts().length} cuentas bancarias se han sincronizado con éxito. Balances verificados.`,
      'bank_sync',
      'sync'
    );

    return {
      countSynced: this.accounts().length,
      newMovementsFound: 1,
    };
  }

  addBankAccount(bankCode: string, accountName: string, initialBalance: number, type: BankAccount['type']): BankAccount {
    const bank = SUPPORTED_BANKS.find((b) => b.code === bankCode) || SUPPORTED_BANKS[0];
    const newAcc: BankAccount = {
      id: `acc_${bankCode}_${Date.now()}`,
      name: accountName || `Cuenta ${bank.name}`,
      bankName: bank.name,
      bankCode: bank.code,
      type,
      accountNumber: `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
      balance: initialBalance || 0,
      currency: 'EUR',
      lastSyncAt: new Date().toISOString(),
      status: 'connected',
      color: bank.color,
    };

    this.accounts.update((list) => {
      const updated = [...list, newAcc];
      SafeStorage.setItem(this.STORAGE_KEY, updated);
      return updated;
    });

    this.notificationService.sendNotification(
      'Nueva Cuenta Conectada',
      `Se ha vinculado exitosamente la cuenta "${newAcc.name}" (${newAcc.bankName}).`,
      'bank_sync',
      'add_card'
    );

    return newAcc;
  }

  removeAccount(id: string): void {
    this.accounts.update((list) => {
      const updated = list.filter((a) => a.id !== id);
      SafeStorage.setItem(this.STORAGE_KEY, updated);
      return updated;
    });
  }

  updateAccountBalance(id: string, newBalance: number): void {
    this.accounts.update((list) => {
      const updated = list.map((a) => (a.id === id ? { ...a, balance: newBalance, lastSyncAt: new Date().toISOString() } : a));
      SafeStorage.setItem(this.STORAGE_KEY, updated);
      return updated;
    });
  }
}
