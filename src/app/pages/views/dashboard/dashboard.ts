import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';

import { FinanceService } from '../../../services/finance.service';
import { BankSyncService } from '../../../services/bank-sync.service';
import { BudgetService } from '../../../services/budget.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { Transaction } from '../../../models/transaction.model';
import { CurrencyFormatPipe } from '../../../core/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../../core/pipes/date-format.pipe';
import { PdfGenerator } from '../../../core/libraries/pdf-generator';
import { CsvExporter } from '../../../core/libraries/csv-exporter';

// Child components
import { CashFlowChart } from '../feature-components/cash-flow-chart';
import { CategoryDonutChart } from '../feature-components/category-donut-chart';
import { TransactionModal } from '../feature-components/transaction-modal';
import { BankSyncModal } from '../feature-components/bank-sync-modal';
import { BudgetManagerModal } from '../feature-components/budget-manager-modal';
import { ExportModal } from '../feature-components/export-modal';

export type DashboardTab = 'overview' | 'transacciones' | 'presupuestos' | 'bancos' | 'reportes';

@Component({
  selector: 'app-dashboard',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    CurrencyFormatPipe,
    DateFormatPipe,
    CashFlowChart,
    CategoryDonutChart,
    TransactionModal,
    BankSyncModal,
    BudgetManagerModal,
    ExportModal,
  ],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto pb-16">
      <!-- Top Welcome Banner & Controls -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hola, {{ authService.currentUser()?.name?.split(' ')?.[0] || 'Alejandro' }} 👋
            </h1>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-300/40 dark:border-emerald-800/40 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              En línea
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Plataforma de gestión financiera personal con sincronización bancaria y alertas automáticas.
          </p>
        </div>

        <!-- Quick Action Buttons -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            (click)="showExportModal.set(true)"
            class="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <mat-icon class="text-sm text-emerald-600 dark:text-emerald-400">download</mat-icon>
            <span>Exportar</span>
          </button>

          <button
            (click)="openNewTransaction()"
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <mat-icon class="text-sm">add_circle</mat-icon>
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs Pill Bar (Syncs with Sidebar) -->
      <div class="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl overflow-x-auto select-none border border-slate-300/40 dark:border-slate-700/50">
        <button
          (click)="selectTab('overview')"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
          [class.bg-white]="activeTab() === 'overview'"
          [class.dark:bg-slate-900]="activeTab() === 'overview'"
          [class.text-emerald-700]="activeTab() === 'overview'"
          [class.dark:text-emerald-400]="activeTab() === 'overview'"
          [class.shadow-xs]="activeTab() === 'overview'"
          [class.text-slate-600]="activeTab() !== 'overview'"
          [class.dark:text-slate-400]="activeTab() !== 'overview'"
        >
          <mat-icon class="text-base">dashboard</mat-icon>
          <span>Panel Principal</span>
        </button>

        <button
          (click)="selectTab('transacciones')"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
          [class.bg-white]="activeTab() === 'transacciones'"
          [class.dark:bg-slate-900]="activeTab() === 'transacciones'"
          [class.text-emerald-700]="activeTab() === 'transacciones'"
          [class.dark:text-emerald-400]="activeTab() === 'transacciones'"
          [class.shadow-xs]="activeTab() === 'transacciones'"
          [class.text-slate-600]="activeTab() !== 'transacciones'"
          [class.dark:text-slate-400]="activeTab() !== 'transacciones'"
        >
          <mat-icon class="text-base">receipt_long</mat-icon>
          <span>Transacciones</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {{ financeService.transactions().length }}
          </span>
        </button>

        <button
          (click)="selectTab('presupuestos')"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
          [class.bg-white]="activeTab() === 'presupuestos'"
          [class.dark:bg-slate-900]="activeTab() === 'presupuestos'"
          [class.text-emerald-700]="activeTab() === 'presupuestos'"
          [class.dark:text-emerald-400]="activeTab() === 'presupuestos'"
          [class.shadow-xs]="activeTab() === 'presupuestos'"
          [class.text-slate-600]="activeTab() !== 'presupuestos'"
          [class.dark:text-slate-400]="activeTab() !== 'presupuestos'"
        >
          <mat-icon class="text-base">donut_large</mat-icon>
          <span>Presupuestos</span>
          @if (budgetService.unreadAlertsCount() > 0) {
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold animate-pulse">
              {{ budgetService.unreadAlertsCount() }}
            </span>
          }
        </button>

        <button
          (click)="selectTab('bancos')"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
          [class.bg-white]="activeTab() === 'bancos'"
          [class.dark:bg-slate-900]="activeTab() === 'bancos'"
          [class.text-emerald-700]="activeTab() === 'bancos'"
          [class.dark:text-emerald-400]="activeTab() === 'bancos'"
          [class.shadow-xs]="activeTab() === 'bancos'"
          [class.text-slate-600]="activeTab() !== 'bancos'"
          [class.dark:text-slate-400]="activeTab() !== 'bancos'"
        >
          <mat-icon class="text-base">account_balance</mat-icon>
          <span>Cuentas Bancarias</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
            {{ bankSyncService.connectedCount() }}
          </span>
        </button>

        <button
          (click)="selectTab('reportes')"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
          [class.bg-white]="activeTab() === 'reportes'"
          [class.dark:bg-slate-900]="activeTab() === 'reportes'"
          [class.text-emerald-700]="activeTab() === 'reportes'"
          [class.dark:text-emerald-400]="activeTab() === 'reportes'"
          [class.shadow-xs]="activeTab() === 'reportes'"
          [class.text-slate-600]="activeTab() !== 'reportes'"
          [class.dark:text-slate-400]="activeTab() !== 'reportes'"
        >
          <mat-icon class="text-base">description</mat-icon>
          <span>Reportes PDF / CSV</span>
        </button>
      </div>

      <!-- ========================================== -->
      <!-- TAB 1: OVERVIEW (Panel Principal)          -->
      <!-- ========================================== -->
      @if (activeTab() === 'overview') {
        <div class="space-y-6">
          <!-- Critical Budget Warning Alert (if any budget reached >= 80% or exceeded) -->
          @if (highestBudgetAlert(); as alert) {
            <div
              class="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-all"
              [class.bg-rose-50]="alert.percentage >= 100"
              [class.border-rose-200]="alert.percentage >= 100"
              [class.dark:bg-rose-950/30]="alert.percentage >= 100"
              [class.dark:border-rose-900/60]="alert.percentage >= 100"
              [class.bg-amber-50]="alert.percentage < 100"
              [class.border-amber-200]="alert.percentage < 100"
              [class.dark:bg-amber-950/30]="alert.percentage < 100"
              [class.dark:border-amber-900/60]="alert.percentage < 100"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  [class.bg-rose-100]="alert.percentage >= 100"
                  [class.text-rose-600]="alert.percentage >= 100"
                  [class.bg-amber-100]="alert.percentage < 100"
                  [class.text-amber-600]="alert.percentage < 100"
                >
                  <mat-icon>{{ alert.percentage >= 100 ? 'warning' : 'info' }}</mat-icon>
                </div>
                <div>
                  <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {{ alert.percentage >= 100 ? '¡Presupuesto Superado!' : 'Alerta de Presupuesto Mensual' }}
                    — {{ alert.budget.categoryName }} ({{ alert.percentage.toFixed(0) }}%)
                  </p>
                  <p class="text-xs text-slate-600 dark:text-slate-300">
                    Has gastado {{ alert.spent | currencyFormat: 'EUR' }} de tu límite de {{ alert.budget.monthlyLimit | currencyFormat: 'EUR' }}.
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button
                  (click)="selectTab('presupuestos')"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  [class.bg-rose-600]="alert.percentage >= 100"
                  [class.hover:bg-rose-500]="alert.percentage >= 100"
                  [class.text-white]="alert.percentage >= 100"
                  [class.bg-amber-600]="alert.percentage < 100"
                  [class.hover:bg-amber-500]="alert.percentage < 100"
                  [class.text-white]="alert.percentage < 100"
                >
                  Ajustar Presupuesto
                </button>
              </div>
            </div>
          }

          <!-- Metric Cards (4 cards) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Balance Total</span>
                <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <mat-icon class="text-base">account_balance_wallet</mat-icon>
                </div>
              </div>
              <div class="space-y-1">
                <p class="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {{ bankSyncService.totalBankBalance() | currencyFormat: 'EUR' }}
                </p>
                <p class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <mat-icon class="text-xs">trending_up</mat-icon>
                  <span>+{{ financeService.netBalance() | currencyFormat: 'EUR': true }} este mes</span>
                </p>
              </div>
            </div>

            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Ingresos del Mes</span>
                <div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <mat-icon class="text-base">arrow_upward</mat-icon>
                </div>
              </div>
              <div class="space-y-1">
                <p class="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  +{{ financeService.totalIncome() | currencyFormat: 'EUR' }}
                </p>
                <p class="text-xs text-slate-400">
                  Nómina y transferencias verificadas
                </p>
              </div>
            </div>

            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Gastos del Mes</span>
                <div class="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <mat-icon class="text-base">arrow_downward</mat-icon>
                </div>
              </div>
              <div class="space-y-1">
                <p class="text-2xl font-extrabold text-slate-900 dark:text-white font-mono text-rose-600 dark:text-rose-400">
                  -{{ financeService.totalExpense() | currencyFormat: 'EUR' }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ (financeService.totalExpense() / (budgetService.totalBudgetLimit() || 1) * 100).toFixed(0) }}% del presupuesto global
                </p>
              </div>
            </div>

            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Tasa de Ahorro</span>
                <div class="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <mat-icon class="text-base">savings</mat-icon>
                </div>
              </div>
              <div class="space-y-2">
                <div class="flex items-baseline justify-between">
                  <p class="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {{ financeService.savingsRate() }}%
                  </p>
                  <span class="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    Objetivo: 20%
                  </span>
                </div>
                <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    [style.width.%]="Math.min(100, financeService.savingsRate() * 2.5)"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Charts Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <mat-icon class="text-emerald-500 text-lg">insights</mat-icon>
                    Flujo Financiero Mensual
                  </h2>
                  <p class="text-xs text-slate-400">
                    Comparativa de ingresos vs gastos y evolución del balance neto
                  </p>
                </div>
                <span class="text-xs font-mono font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
                  Últimos 6 meses
                </span>
              </div>
              <app-cash-flow-chart [data]="financeService.monthlyHistory()" />
            </div>

            <div class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <mat-icon class="text-indigo-500 text-lg">pie_chart</mat-icon>
                      Gastos por Categoría
                    </h2>
                    <p class="text-xs text-slate-400">
                      Desglose porcentual del mes
                    </p>
                  </div>
                  <button
                    (click)="selectTab('presupuestos')"
                    class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Ver metas
                  </button>
                </div>
                <app-category-donut-chart [items]="financeService.expensesByCategory()" />
              </div>
            </div>
          </div>

          <!-- Quick Banks Overview -->
          <div class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2.5">
                <mat-icon class="text-blue-500">account_balance</mat-icon>
                <h3 class="text-base font-bold text-slate-900 dark:text-white">Cuentas Bancarias</h3>
              </div>
              <button
                (click)="selectTab('bancos')"
                class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Ver todas y sincronizar →
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              @for (acc of bankSyncService.accounts().slice(0, 4); track acc.id) {
                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div class="truncate">
                    <p class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ acc.name }}</p>
                    <p class="text-[10px] text-slate-400 font-mono">{{ acc.bankName }} • {{ acc.accountNumber }}</p>
                  </div>
                  <p class="text-xs font-bold text-slate-900 dark:text-white font-mono shrink-0 pl-2">
                    {{ acc.balance | currencyFormat: 'EUR' }}
                  </p>
                </div>
              }
            </div>
          </div>

          <!-- Recent Movements Preview -->
          <div class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2.5">
                <mat-icon class="text-emerald-500">receipt_long</mat-icon>
                <h3 class="text-base font-bold text-slate-900 dark:text-white">Últimos Movimientos</h3>
              </div>
              <button
                (click)="selectTab('transacciones')"
                class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Ir a todas las transacciones →
              </button>
            </div>

            <div class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (tx of financeService.transactions().slice(0, 5); track tx.id) {
                <div class="py-3 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3 truncate">
                    <span
                      class="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 text-xs"
                      [style.backgroundColor]="tx.categoryColor || '#64748b'"
                    >
                      <mat-icon class="text-sm">{{ tx.categoryIcon || 'payments' }}</mat-icon>
                    </span>
                    <div class="truncate">
                      <p class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ tx.description }}</p>
                      <p class="text-[10px] text-slate-400">{{ tx.categoryName }} • {{ tx.date | dateFormat: 'short' }}</p>
                    </div>
                  </div>
                  <span
                    class="font-mono font-bold text-xs shrink-0"
                    [class.text-rose-600]="tx.type === 'expense'"
                    [class.dark:text-rose-400]="tx.type === 'expense'"
                    [class.text-emerald-600]="tx.type === 'income'"
                    [class.dark:text-emerald-400]="tx.type === 'income'"
                  >
                    {{ tx.type === 'expense' ? '-' : '+' }}{{ tx.amount | currencyFormat: 'EUR' }}
                  </span>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ========================================== -->
      <!-- TAB 2: TRANSACCIONES (Gestión completa)    -->
      <!-- ========================================== -->
      @if (activeTab() === 'transacciones') {
        <div class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <mat-icon class="text-emerald-500">receipt_long</mat-icon>
                Historial Completo de Transacciones
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {{ financeService.filteredTransactions().length }} movimientos
                </span>
              </h2>
              <p class="text-xs text-slate-400">
                Filtra, busca, edita o exporta todos tus gastos e ingresos registrados.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- Type Pills -->
              <div class="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold">
                <button
                  (click)="financeService.selectedTypeFilter.set('all')"
                  class="px-3 py-1 rounded-lg transition-all cursor-pointer"
                  [class.bg-white]="financeService.selectedTypeFilter() === 'all'"
                  [class.dark:bg-slate-900]="financeService.selectedTypeFilter() === 'all'"
                  [class.text-slate-900]="financeService.selectedTypeFilter() === 'all'"
                  [class.dark:text-white]="financeService.selectedTypeFilter() === 'all'"
                  [class.shadow-xs]="financeService.selectedTypeFilter() === 'all'"
                  [class.text-slate-500]="financeService.selectedTypeFilter() !== 'all'"
                >
                  Todos
                </button>
                <button
                  (click)="financeService.selectedTypeFilter.set('expense')"
                  class="px-3 py-1 rounded-lg transition-all cursor-pointer"
                  [class.bg-white]="financeService.selectedTypeFilter() === 'expense'"
                  [class.dark:bg-slate-900]="financeService.selectedTypeFilter() === 'expense'"
                  [class.text-rose-600]="financeService.selectedTypeFilter() === 'expense'"
                  [class.shadow-xs]="financeService.selectedTypeFilter() === 'expense'"
                  [class.text-slate-500]="financeService.selectedTypeFilter() !== 'expense'"
                >
                  Gastos
                </button>
                <button
                  (click)="financeService.selectedTypeFilter.set('income')"
                  class="px-3 py-1 rounded-lg transition-all cursor-pointer"
                  [class.bg-white]="financeService.selectedTypeFilter() === 'income'"
                  [class.dark:bg-slate-900]="financeService.selectedTypeFilter() === 'income'"
                  [class.text-emerald-600]="financeService.selectedTypeFilter() === 'income'"
                  [class.shadow-xs]="financeService.selectedTypeFilter() === 'income'"
                  [class.text-slate-500]="financeService.selectedTypeFilter() !== 'income'"
                >
                  Ingresos
                </button>
              </div>

              <!-- Category filter -->
              <select
                [value]="financeService.selectedCategoryFilter()"
                (change)="onCategoryFilterChange($event)"
                class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-transparent focus:border-emerald-500 outline-none"
              >
                <option value="all">Todas las categorías</option>
                @for (cat of financeService.categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>

              <button
                (click)="openNewTransaction()"
                class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <mat-icon class="text-sm">add</mat-icon>
                <span>Nuevo</span>
              </button>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table class="w-full text-left border-collapse" aria-label="Tabla de transacciones financieras">
              <thead>
                <tr class="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th scope="col" class="py-3 px-4">Concepto</th>
                  <th scope="col" class="py-3 px-3">Categoría</th>
                  <th scope="col" class="py-3 px-3 hidden sm:table-cell">Cuenta</th>
                  <th scope="col" class="py-3 px-3 hidden md:table-cell">Fecha</th>
                  <th scope="col" class="py-3 px-3">Estado</th>
                  <th scope="col" class="py-3 px-4 text-right">Monto</th>
                  <th scope="col" class="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                @for (tx of financeService.filteredTransactions(); track tx.id) {
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <span
                          class="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                          [style.backgroundColor]="tx.categoryColor || '#64748b'"
                        >
                          <mat-icon class="text-sm">{{ tx.categoryIcon || 'payments' }}</mat-icon>
                        </span>
                        <div class="truncate max-w-[220px]">
                          <p class="font-bold text-slate-900 dark:text-white truncate">{{ tx.description }}</p>
                          @if (tx.notes) {
                            <p class="text-[11px] text-slate-400 truncate">{{ tx.notes }}</p>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {{ tx.categoryName || 'Varios' }}
                    </td>
                    <td class="py-3 px-3 hidden sm:table-cell text-slate-500 dark:text-slate-400">
                      {{ tx.accountName || 'Cuenta' }}
                    </td>
                    <td class="py-3 px-3 hidden md:table-cell text-slate-400 font-mono">
                      {{ tx.date | dateFormat: 'short' }}
                    </td>
                    <td class="py-3 px-3">
                      <span
                        class="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                        [class.bg-emerald-100]="tx.status === 'cleared'"
                        [class.text-emerald-700]="tx.status === 'cleared'"
                        [class.dark:bg-emerald-950/60]="tx.status === 'cleared'"
                        [class.dark:text-emerald-400]="tx.status === 'cleared'"
                      >
                        <span class="w-1 h-1 rounded-full bg-current"></span>
                        {{ tx.status === 'cleared' ? 'Confirmado' : 'Pendiente' }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <span
                        class="font-mono font-bold text-xs sm:text-sm"
                        [class.text-rose-600]="tx.type === 'expense'"
                        [class.dark:text-rose-400]="tx.type === 'expense'"
                        [class.text-emerald-600]="tx.type === 'income'"
                        [class.dark:text-emerald-400]="tx.type === 'income'"
                      >
                        {{ tx.type === 'expense' ? '-' : '+' }}{{ tx.amount | currencyFormat: 'EUR' }}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <button
                          (click)="editTransaction(tx)"
                          class="p-1 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Editar"
                        >
                          <mat-icon class="text-base">edit</mat-icon>
                        </button>
                        <button
                          (click)="deleteTransaction(tx.id)"
                          class="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Eliminar"
                        >
                          <mat-icon class="text-base">delete</mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400">
                      <p class="font-bold text-sm">No hay transacciones registradas</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ========================================== -->
      <!-- TAB 3: PRESUPUESTOS (Metas y Alertas)      -->
      <!-- ========================================== -->
      @if (activeTab() === 'presupuestos') {
        <div class="space-y-6">
          <div class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <mat-icon class="text-amber-500">donut_large</mat-icon>
                  Presupuestos Mensuales & Alertas Automáticas
                </h2>
                <p class="text-xs text-slate-400">
                  Controla techos de gasto y recibe avisos push automáticos al alcanzar el 75%, 90% o superar el 100%.
                </p>
              </div>

              <button
                (click)="showCreateBudgetForm.set(!showCreateBudgetForm())"
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <mat-icon class="text-sm">{{ showCreateBudgetForm() ? 'remove' : 'add' }}</mat-icon>
                <span>{{ showCreateBudgetForm() ? 'Ocultar Formulario' : 'Nuevo Presupuesto' }}</span>
              </button>
            </div>

            <!-- Global Progress Bar -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div class="flex items-baseline justify-between mb-2">
                <div>
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Presupuesto Mensual Global</span>
                  <p class="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                    {{ financeService.totalExpense() | currencyFormat: 'EUR' }}
                    <span class="text-xs font-normal text-slate-400">
                      de {{ budgetService.totalBudgetLimit() | currencyFormat: 'EUR' }}
                    </span>
                  </p>
                </div>
                <span
                  class="text-xs font-bold px-2.5 py-1 rounded-full"
                  [class.bg-emerald-100]="globalBudgetPct() < 75"
                  [class.text-emerald-700]="globalBudgetPct() < 75"
                  [class.bg-amber-100]="globalBudgetPct() >= 75 && globalBudgetPct() < 100"
                  [class.text-amber-700]="globalBudgetPct() >= 75 && globalBudgetPct() < 100"
                  [class.bg-rose-100]="globalBudgetPct() >= 100"
                  [class.text-rose-700]="globalBudgetPct() >= 100"
                >
                  {{ globalBudgetPct().toFixed(1) }}% consumido
                </span>
              </div>

              <div class="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  [style.width.%]="Math.min(100, globalBudgetPct())"
                  [class.bg-emerald-500]="globalBudgetPct() < 75"
                  [class.bg-amber-500]="globalBudgetPct() >= 75 && globalBudgetPct() < 100"
                  [class.bg-rose-500]="globalBudgetPct() >= 100"
                ></div>
              </div>
            </div>

            <!-- Add/Edit Budget Inline Form -->
            @if (showCreateBudgetForm()) {
              <div class="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                  Configurar Límite Mensual para una Categoría
                </h4>

                <form [formGroup]="budgetForm" (ngSubmit)="onSaveBudgetInline()" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="dash-b-category" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Categoría
                    </label>
                    <select
                      id="dash-b-category"
                      formControlName="categoryId"
                      class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    >
                      @for (cat of expenseCategories(); track cat.id) {
                        <option [value]="cat.id">{{ cat.name }}</option>
                      }
                    </select>
                  </div>

                  <div>
                    <label for="dash-b-limit" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Límite Mensual (€)
                    </label>
                    <input
                      id="dash-b-limit"
                      type="number"
                      step="10"
                      formControlName="monthlyLimit"
                      placeholder="350"
                      class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div class="sm:col-span-2 flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      (click)="showCreateBudgetForm.set(false)"
                      class="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200/50 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      [disabled]="budgetForm.invalid"
                      class="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      Guardar Límite
                    </button>
                  </div>
                </form>
              </div>
            }

            <!-- Category Budgets Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (budget of budgetService.budgets(); track budget.id) {
                @let spent = financeService.categorySpentMap()[budget.categoryId] || 0;
                @let pct = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;

                <div class="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <span
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs"
                        [style.backgroundColor]="budget.categoryColor"
                      >
                        <mat-icon class="text-sm">{{ budget.categoryIcon }}</mat-icon>
                      </span>
                      <span class="text-sm font-bold text-slate-900 dark:text-white">
                        {{ budget.categoryName }}
                      </span>
                    </div>

                    <div class="flex items-center gap-2">
                      <span
                        class="text-[10px] font-bold px-2 py-0.5 rounded-md"
                        [class.bg-rose-100]="pct >= 100"
                        [class.text-rose-600]="pct >= 100"
                        [class.dark:bg-rose-950]="pct >= 100"
                        [class.bg-amber-100]="pct >= 75 && pct < 100"
                        [class.text-amber-700]="pct >= 75 && pct < 100"
                        [class.dark:bg-amber-950]="pct >= 75 && pct < 100"
                        [class.bg-emerald-100]="pct < 75"
                        [class.text-emerald-700]="pct < 75"
                        [class.dark:bg-emerald-950]="pct < 75"
                      >
                        {{ pct >= 100 ? 'Excedido (' + Math.round(pct) + '%)' : Math.round(pct) + '%' }}
                      </span>

                      <button
                        (click)="budgetService.deleteBudget(budget.id)"
                        class="p-1 text-slate-300 hover:text-rose-500 rounded-lg"
                        title="Eliminar presupuesto"
                      >
                        <mat-icon class="text-sm">delete_outline</mat-icon>
                      </button>
                    </div>
                  </div>

                  <div class="flex items-baseline justify-between text-xs font-mono">
                    <span class="text-slate-500">Gastado: {{ spent | currencyFormat: 'EUR' }}</span>
                    <span class="text-slate-800 dark:text-slate-200 font-bold">Límite: {{ budget.monthlyLimit | currencyFormat: 'EUR' }}</span>
                  </div>

                  <div class="w-full h-2 bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      [style.width.%]="Math.min(100, pct)"
                      [class.bg-emerald-500]="pct < 75"
                      [class.bg-amber-500]="pct >= 75 && pct < 100"
                      [class.bg-rose-500]="pct >= 100"
                    ></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ========================================== -->
      <!-- TAB 4: BANCOS (Open Banking PSD2)          -->
      <!-- ========================================== -->
      @if (activeTab() === 'bancos') {
        <div class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <mat-icon class="text-blue-500">account_balance</mat-icon>
                Conector Bancario & Cuentas Vinculadas
                <span class="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  PSD2 Open Banking
                </span>
              </h2>
              <p class="text-xs text-slate-400">
                Sincroniza tus entidades financieras, concilia saldos e importa transacciones automáticamente.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                (click)="triggerSyncAll()"
                [disabled]="bankSyncService.isSyncingAll()"
                class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <mat-icon [class.animate-spin]="bankSyncService.isSyncingAll()" class="text-sm">sync</mat-icon>
                <span>{{ bankSyncService.isSyncingAll() ? 'Sincronizando...' : 'Sincronizar Todas' }}</span>
              </button>

              <button
                (click)="showBankModal.set(true)"
                class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <mat-icon class="text-sm">add_link</mat-icon>
                <span>Vincular Banco</span>
              </button>
            </div>
          </div>

          <!-- Total Bank Header -->
          <div class="p-4 rounded-2xl bg-gradient-to-r from-blue-900/10 via-emerald-900/10 to-teal-900/10 dark:from-blue-950/40 dark:to-teal-950/40 border border-blue-200/60 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400">Saldo Consolidado en Bancos</p>
              <p class="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                {{ bankSyncService.totalBankBalance() | currencyFormat: 'EUR' }}
              </p>
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <mat-icon class="text-emerald-500 text-base">verified</mat-icon>
              <span>{{ bankSyncService.connectedCount() }} entidades verificadas y cifradas TLS 1.3</span>
            </div>
          </div>

          <!-- Accounts Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (acc of bankSyncService.accounts(); track acc.id) {
              <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 truncate">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 font-bold text-xs"
                    [style.backgroundColor]="acc.color"
                  >
                    <mat-icon class="text-base">
                      {{ acc.type === 'credit' ? 'credit_card' : acc.type === 'wallet' ? 'wallet' : 'account_balance' }}
                    </mat-icon>
                  </div>
                  <div class="truncate">
                    <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ acc.name }}</p>
                    <p class="text-xs text-slate-400 font-mono">{{ acc.bankName }} • {{ acc.accountNumber }}</p>
                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Actualizado {{ acc.lastSyncAt | dateFormat: 'relative' }}
                    </span>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <p class="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                    {{ acc.balance | currencyFormat: 'EUR' }}
                  </p>
                  <button
                    (click)="bankSyncService.removeAccount(acc.id)"
                    class="p-1 text-slate-300 hover:text-rose-500 rounded-lg cursor-pointer"
                    title="Desvincular"
                  >
                    <mat-icon class="text-sm">delete_outline</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ========================================== -->
      <!-- TAB 5: REPORTES PDF / CSV                  -->
      <!-- ========================================== -->
      @if (activeTab() === 'reportes') {
        <div class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <mat-icon class="text-emerald-500">description</mat-icon>
              Exportación de Reportes Financieros
            </h2>
            <p class="text-xs text-slate-400">
              Genera documentos ejecutivos en PDF o exporta hojas de datos tabulares CSV para Excel y Google Sheets.
            </p>
          </div>

          <!-- Preview Metrics Box -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Datos del Período Actual</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Ingresos</span>
                <span class="text-sm font-bold text-emerald-600 font-mono">+{{ financeService.totalIncome() | currencyFormat: 'EUR' }}</span>
              </div>
              <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Gastos</span>
                <span class="text-sm font-bold text-rose-600 font-mono">-{{ financeService.totalExpense() | currencyFormat: 'EUR' }}</span>
              </div>
              <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-[10px] uppercase font-bold text-slate-400 block">Balance Neto</span>
                <span class="text-sm font-bold text-blue-600 font-mono">{{ financeService.netBalance() | currencyFormat: 'EUR': true }}</span>
              </div>
              <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-[10px] uppercase font-bold text-slate-400 block">Tasa Ahorro</span>
                <span class="text-sm font-bold text-indigo-600 font-mono">{{ financeService.savingsRate() }}%</span>
              </div>
            </div>
          </div>

          <!-- Direct Download Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- PDF Card -->
            <div class="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 flex flex-col justify-between gap-4 transition-all">
              <div class="flex items-start gap-3.5">
                <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <mat-icon class="text-2xl">picture_as_pdf</mat-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Informe Financiero Formal (PDF)
                    <span class="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded">
                      A4
                    </span>
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Documento formal con membrete institucional, resumen ejecutivo, tabla de distribución y movimientos detallados.
                  </p>
                </div>
              </div>

              <button
                (click)="directExportPdf()"
                [disabled]="isGeneratingPdf()"
                class="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <mat-icon class="text-sm">download</mat-icon>
                <span>{{ isGeneratingPdf() ? 'Generando PDF...' : 'Descargar Informe PDF' }}</span>
              </button>
            </div>

            <!-- CSV Card -->
            <div class="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 flex flex-col justify-between gap-4 transition-all">
              <div class="flex items-start gap-3.5">
                <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <mat-icon class="text-2xl">table_chart</mat-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                    Hoja de Datos Tabular (CSV)
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Exporta todas tus transacciones con codificación UTF-8 compatible con Microsoft Excel, Google Sheets y Numbers.
                  </p>
                </div>
              </div>

              <button
                (click)="directExportCsv()"
                class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <mat-icon class="text-sm">download</mat-icon>
                <span>Descargar Archivo CSV</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Modals -->
    @if (showTransactionModal()) {
      <app-transaction-modal
        [transactionToEdit]="editingTransaction()"
        (closeModal)="closeTransactionModal()"
      />
    }

    @if (showBankModal()) {
      <app-bank-sync-modal (closeModal)="showBankModal.set(false)" />
    }

    @if (showBudgetModal()) {
      <app-budget-manager-modal (closeModal)="showBudgetModal.set(false)" />
    }

    @if (showExportModal()) {
      <app-export-modal (closeModal)="showExportModal.set(false)" />
    }
  `,
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly financeService = inject(FinanceService);
  readonly bankSyncService = inject(BankSyncService);
  readonly budgetService = inject(BudgetService);
  readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);

  readonly Math = Math;

  // Active section tab
  readonly activeTab = signal<DashboardTab>('overview');

  // Modals state
  readonly showTransactionModal = signal<boolean>(false);
  readonly showBankModal = signal<boolean>(false);
  readonly showBudgetModal = signal<boolean>(false);
  readonly showExportModal = signal<boolean>(false);

  readonly showCreateBudgetForm = signal<boolean>(false);
  readonly isGeneratingPdf = signal<boolean>(false);
  readonly editingTransaction = signal<Transaction | null>(null);

  private routeSub?: Subscription;

  readonly budgetForm = new FormGroup({
    categoryId: new FormControl<string>('cat_food', { nonNullable: true }),
    monthlyLimit: new FormControl<number>(350, [Validators.required, Validators.min(10)]),
  });

  readonly expenseCategories = () =>
    this.financeService.categories().filter((c) => c.type === 'expense');

  readonly globalBudgetPct = () => {
    const totalLimit = this.budgetService.totalBudgetLimit();
    if (totalLimit <= 0) return 0;
    return (this.financeService.totalExpense() / totalLimit) * 100;
  };

  readonly highestBudgetAlert = computed(() => {
    const budgets = this.budgetService.budgets();
    const spentMap = this.financeService.categorySpentMap();

    let worst = null;
    let maxPct = 0;

    for (const b of budgets) {
      const spent = spentMap[b.categoryId] || 0;
      const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
      if (pct >= 80 && pct > maxPct) {
        maxPct = pct;
        worst = {
          budget: b,
          spent,
          percentage: pct,
        };
      }
    }

    return worst;
  });

  ngOnInit(): void {
    // Listen to route params and update activeTab
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const tabParam = params.get('tab') as DashboardTab | null;
      if (tabParam && ['overview', 'transacciones', 'presupuestos', 'bancos', 'reportes'].includes(tabParam)) {
        this.activeTab.set(tabParam);
      } else {
        this.activeTab.set('overview');
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  selectTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
    if (tab === 'overview') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/dashboard', tab]);
    }
  }

  openNewTransaction(): void {
    this.editingTransaction.set(null);
    this.showTransactionModal.set(true);
  }

  editTransaction(tx: Transaction): void {
    this.editingTransaction.set(tx);
    this.showTransactionModal.set(true);
  }

  closeTransactionModal(): void {
    this.showTransactionModal.set(false);
    this.editingTransaction.set(null);
  }

  deleteTransaction(id: string): void {
    this.financeService.deleteTransaction(id);
  }

  onCategoryFilterChange(event: Event): void {
    const sel = event.target as HTMLSelectElement;
    this.financeService.selectedCategoryFilter.set(sel.value);
  }

  onSaveBudgetInline(): void {
    if (this.budgetForm.invalid) return;
    const { categoryId, monthlyLimit } = this.budgetForm.getRawValue();
    const cat = this.financeService.categories().find((c) => c.id === categoryId);
    if (cat) {
      this.budgetService.setBudget(cat.id, cat.name, cat.color, cat.icon, Number(monthlyLimit));
      this.showCreateBudgetForm.set(false);
    }
  }

  async triggerSyncAll(): Promise<void> {
    const res = await this.bankSyncService.syncAllAccounts();
    if (res.newMovementsFound > 0) {
      const accounts = this.bankSyncService.accounts();
      const targetAcc = accounts[0] || null;
      if (targetAcc) {
        this.financeService.importBankMovement(
          targetAcc.id,
          'Reembolso Transferencia Bizum Recibido',
          35.00,
          'income',
          'cat_other_income'
        );
      }
    }
  }

  directExportPdf(): void {
    this.isGeneratingPdf.set(true);
    try {
      const user = this.authService.currentUser();
      PdfGenerator.generateReport({
        userName: user?.name || 'Usuario Fintrack',
        userEmail: user?.email || 'usuario@fintrack.io',
        currency: 'EUR',
        dateRange: 'Mes Actual (Octubre 2026)',
        transactions: this.financeService.transactions(),
        budgets: this.budgetService.budgets(),
        totalIncome: this.financeService.totalIncome(),
        totalExpense: this.financeService.totalExpense(),
        netBalance: this.financeService.netBalance(),
      });

      this.notificationService.sendNotification(
        'Informe PDF Descargado',
        'Tu reporte financiero mensual en formato PDF ha sido generado y descargado.',
        'system',
        'picture_as_pdf'
      );
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }

  directExportCsv(): void {
    CsvExporter.exportTransactions(
      this.financeService.transactions(),
      `fintrack_movimientos_${new Date().toISOString().slice(0, 10)}.csv`
    );

    this.notificationService.sendNotification(
      'Archivo CSV Generado',
      'Tus transacciones se han exportado en archivo CSV para Excel o Google Sheets.',
      'system',
      'table_chart'
    );
  }
}
