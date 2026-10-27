export type TransactionType = 'expense' | 'income';

export type TransactionStatus = 'cleared' | 'pending';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  date: string; // ISO string YYYY-MM-DD
  description: string;
  accountId: string;
  accountName?: string;
  status: TransactionStatus;
  notes?: string;
  isRecurring?: boolean;
  tags?: string[];
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Alimentación', icon: 'restaurant', color: '#f59e0b', type: 'expense' },
  { id: 'cat_housing', name: 'Vivienda y Servicios', icon: 'home', color: '#3b82f6', type: 'expense' },
  { id: 'cat_transport', name: 'Transporte', icon: 'directions_car', color: '#6366f1', type: 'expense' },
  { id: 'cat_entertainment', name: 'Entretenimiento', icon: 'sports_esports', color: '#ec4899', type: 'expense' },
  { id: 'cat_health', name: 'Salud y Bienestar', icon: 'favorite', color: '#ef4444', type: 'expense' },
  { id: 'cat_education', name: 'Educación', icon: 'school', color: '#8b5cf6', type: 'expense' },
  { id: 'cat_shopping', name: 'Compras', icon: 'shopping_bag', color: '#10b981', type: 'expense' },
  { id: 'cat_travel', name: 'Viajes', icon: 'flight', color: '#06b6d4', type: 'expense' },
  { id: 'cat_utilities', name: 'Suscripciones y Luz', icon: 'bolt', color: '#eab308', type: 'expense' },
  { id: 'cat_other_expense', name: 'Otros Gastos', icon: 'more_horiz', color: '#64748b', type: 'expense' },
  { id: 'cat_salary', name: 'Nómina / Salario', icon: 'payments', color: '#10b981', type: 'income' },
  { id: 'cat_investments', name: 'Inversiones y Dividendos', icon: 'trending_up', color: '#059669', type: 'income' },
  { id: 'cat_freelance', name: 'Trabajos Extra / Freelance', icon: 'laptop_mac', color: '#0284c7', type: 'income' },
  { id: 'cat_other_income', name: 'Otros Ingresos', icon: 'savings', color: '#84cc16', type: 'income' },
];
