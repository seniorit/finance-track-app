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
  userId?: string;
  name: string;
  bankName: string;
  bankCode: string;
  type: BankAccountType;
  accountNumber: string; // e.g. "•••• 8921"
  balance: number;
  currency: 'VES' | 'USD' | string;
  lastSyncAt: string; // ISO string
  status: BankConnectionStatus;
  color: string;
  isDefault?: boolean;
}

export const SUPPORTED_BANKS: BankInstitution[] = [
  { id: 'bdv', name: 'Banco de Venezuela (BDV)', code: 'bdv', color: '#b91c1c', badge: 'BDV', icon: 'account_balance' },
  { id: 'banesco', name: 'Banesco Banco Universal', code: 'banesco', color: '#047857', badge: 'BNS', icon: 'account_balance' },
  { id: 'mercantil', name: 'Banco Mercantil', code: 'mercantil', color: '#1d4ed8', badge: 'MERC', icon: 'account_balance' },
  { id: 'provincial', name: 'BBVA Provincial', code: 'provincial', color: '#004481', badge: 'PROV', icon: 'account_balance' },
  { id: 'bancamiga', name: 'Bancamiga Banco Universal', code: 'bancamiga', color: '#d97706', badge: 'BMG', icon: 'credit_card' },
  { id: 'bnc', name: 'Banco Nacional de Crédito (BNC)', code: 'bnc', color: '#0284c7', badge: 'BNC', icon: 'account_balance' },
  { id: 'banplus', name: 'Banplus Banco Universal', code: 'banplus', color: '#ea580c', badge: 'BPL', icon: 'account_balance' },
  { id: 'pagomovil', name: 'Pago Móvil C2P / P2P', code: 'pagomovil', color: '#7c3aed', badge: 'PM', icon: 'phonelink_ring' },
  { id: 'efectivo_ves', name: 'Efectivo Bolívares (VES)', code: 'cash_ves', color: '#10b981', badge: 'VES', icon: 'wallet' },
  { id: 'efectivo_usd', name: 'Efectivo Dólares (USD Cash)', code: 'cash_usd', color: '#059669', badge: 'USD', icon: 'payments' },
  { id: 'zinli', name: 'Zinli / Billetera Digital', code: 'zinli', color: '#6366f1', badge: 'ZIN', icon: 'credit_card' },
  { id: 'wally', name: 'Wally Tech USD', code: 'wally', color: '#0ea5e9', badge: 'WAL', icon: 'wallet' },
  { id: 'binance', name: 'Binance Pay / USDT', code: 'binance', color: '#eab308', badge: 'BNB', icon: 'currency_bitcoin' },
  { id: 'otro', name: 'Otra Entidad Financiera', code: 'otro', color: '#64748b', badge: 'OTR', icon: 'account_balance' },
];
