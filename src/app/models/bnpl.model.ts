export type BnplProviderId = 'cashea' | 'krece' | 'creditotal' | 'custom';

export interface BnplProvider {
  id: BnplProviderId;
  name: string;
  tagline: string;
  color: string;
  textColor: string;
  borderColor: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  defaultInstallments: number[];
  defaultFrequencyDays: number; // 14 for biweekly
}

export const BNPL_PROVIDERS: BnplProvider[] = [
  {
    id: 'cashea',
    name: 'Cashea',
    tagline: 'Compra ahora, paga después en cuotas sin interés',
    color: '#eab308',
    textColor: '#ca8a04',
    borderColor: '#fde047',
    icon: 'shopping_bag',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-950/60',
    badgeText: 'text-yellow-800 dark:text-yellow-300',
    defaultInstallments: [3, 6, 9, 12],
    defaultFrequencyDays: 14,
  },
  {
    id: 'krece',
    name: 'Krece',
    tagline: 'Financiamiento ágil de compras y tecnología',
    color: '#8b5cf6',
    textColor: '#7c3aed',
    borderColor: '#c4b5fd',
    icon: 'smartphone',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    badgeText: 'text-purple-800 dark:text-purple-300',
    defaultInstallments: [3, 6, 9],
    defaultFrequencyDays: 14,
  },
  {
    id: 'creditotal',
    name: 'Creditotal',
    tagline: 'Crédito digital Tiedas Total',
    color: '#06b6d4',
    textColor: '#0891b2',
    borderColor: '#67e8f9',
    icon: 'shopping_cart',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-950/60',
    badgeText: 'text-cyan-800 dark:text-cyan-300',
    defaultInstallments: [3, 6],
    defaultFrequencyDays: 14,
  },
  {
    id: 'custom',
    name: 'Otro Proveedor',
    tagline: 'Sistema de financiamiento en cuotas personalizado',
    color: '#10b981',
    textColor: '#059669',
    borderColor: '#6ee7b7',
    icon: 'storefront',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    defaultInstallments: [3, 6, 9, 12],
    defaultFrequencyDays: 14,
  },
];

export interface CasheaLevelPreset {
  level: string;
  percent: number;
  description: string;
}

export const CASHEA_DOWN_PAYMENT_PRESETS: CasheaLevelPreset[] = [
  {
    level: 'Nivel 1 (60% Inicial)',
    percent: 60,
    description: 'Inicial del 60% y 3 cuotas restantes',
  },
  {
    level: 'Nivel 2 (50% Inicial)',
    percent: 50,
    description: 'Inicial del 50% y 3 cuotas restantes',
  },
  {
    level: 'Nivel 3 (40% Inicial)',
    percent: 40,
    description: 'Inicial del 40% y cuotas extendidas',
  },
  { level: 'Nivel 4 / 5 (20% Inicial)', percent: 20, description: 'Inicial reducida del 20%' },
  { level: 'Inicial Cero (0%)', percent: 0, description: '100% financiado sin pago inicial' },
];

export interface BnplInstallment {
  number: number;
  dueDate: string; // YYYY-MM-DD
  amountUsd: number;
  status: 'pending' | 'paid';
  paidAt?: string;
  transactionId?: string;
  accountId?: string;
  accountName?: string;
}

export interface BnplPurchase {
  id: string;
  userId?: string;
  providerId: BnplProviderId;
  providerName: string;
  storeName: string;
  itemDescription: string;
  purchaseDate: string; // YYYY-MM-DD
  currency: 'USD' | 'VES';
  totalAmountUsd: number;
  downPaymentPercent: number; // e.g. 60, 50, 40, 20, 0
  downPaymentUsd: number;
  financedAmountUsd: number;
  installmentsCount: number; // 3, 6, 9, 12
  frequencyDays: number; // usually 14 or 15 days
  firstDueDate: string;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  installments: BnplInstallment[];
  createdAt: string;
  updatedAt: string;
}
