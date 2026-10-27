export type BankAccountType = 'checking' | 'savings' | 'credit' | 'wallet';

export type BankConnectionStatus = 'connected' | 'syncing' | 'error' | 'disconnected';

export interface BankInstitution {
  id: string;
  name: string;
  code: string;
  color: string;
  badge: string;
  icon: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  bankCode: string;
  type: BankAccountType;
  accountNumber: string; // e.g. "•••• 8921"
  balance: number;
  currency: string;
  lastSyncAt: string; // ISO string
  status: BankConnectionStatus;
  color: string;
  isDefault?: boolean;
}

export const SUPPORTED_BANKS: BankInstitution[] = [
  { id: 'bbva', name: 'BBVA', code: 'bbva', color: '#004481', badge: 'BBVA', icon: 'account_balance' },
  { id: 'santander', name: 'Banco Santander', code: 'santander', color: '#ec0000', badge: 'SAN', icon: 'account_balance' },
  { id: 'caixa', name: 'CaixaBank', code: 'caixa', color: '#007eae', badge: 'CABK', icon: 'account_balance' },
  { id: 'revolut', name: 'Revolut', code: 'revolut', color: '#19b4ff', badge: 'REV', icon: 'credit_card' },
  { id: 'chase', name: 'Chase Bank', code: 'chase', color: '#117aca', badge: 'JPMC', icon: 'account_balance' },
  { id: 'mercadopago', name: 'Mercado Pago', code: 'mercadopago', color: '#009ee3', badge: 'MP', icon: 'account_balance_wallet' },
  { id: 'efectivo', name: 'Billetera Efectivo', code: 'cash', color: '#10b981', badge: 'CASH', icon: 'wallet' },
];
