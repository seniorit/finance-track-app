import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { CsvExporter } from '../../../core/libraries/csv-exporter';
import { PdfGenerator } from '../../../core/libraries/pdf-generator';
import { CurrencyFormatPipe } from '../../../core/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../../core/pipes/date-format.pipe';
import { Transaction } from '../../../models/transaction.model';
import { AuthService } from '../../../services/auth.service';
import { BankSyncService } from '../../../services/bank-sync.service';
import { BcvService } from '../../../services/bcv.service';
import { BudgetService } from '../../../services/budget.service';
import { FinanceService } from '../../../services/finance.service';
import { NotificationService } from '../../../services/notification.service';

// Child components
import { BnplInstallment, BnplPurchase } from '../../../models/bnpl.model';
import { BnplService, PendingInstallmentItem } from '../../../services/bnpl.service';
import { BankSyncModal } from '../feature-components/bank-sync-modal';
import { BnplPayModal, PayModalTarget } from '../feature-components/bnpl-pay-modal';
import { BnplPurchaseModal } from '../feature-components/bnpl-purchase-modal';
import { BudgetManagerModal } from '../feature-components/budget-manager-modal';
import { CashFlowChart } from '../feature-components/cash-flow-chart';
import { CategoryDonutChart } from '../feature-components/category-donut-chart';
import { ExportModal } from '../feature-components/export-modal';
import { TransactionModal } from '../feature-components/transaction-modal';
import { UserProfileModal } from '../feature-components/user-profile-modal';

export type DashboardTab =
  'overview' | 'transacciones' | 'presupuestos' | 'bancos' | 'deudas' | 'reportes';

@Component({
  selector: 'app-dashboard',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    DecimalPipe,
    CurrencyFormatPipe,
    DateFormatPipe,
    CashFlowChart,
    CategoryDonutChart,
    TransactionModal,
    BankSyncModal,
    BudgetManagerModal,
    ExportModal,
    UserProfileModal,
    BnplPurchaseModal,
    BnplPayModal,
  ],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto pb-16">
      <!-- Top Contextual View Header & Actions -->
      <div
        class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <!-- Breadcrumb navigation -->
          <div
            class="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-1.5 font-medium"
          >
            <span class="hover:text-slate-600 dark:hover:text-slate-300">Finanzas</span>
            <span>/</span>
            <span class="text-emerald-700 dark:text-emerald-400 font-semibold">{{
              currentTabTitle()
            }}</span>
          </div>

          @switch (activeTab()) {
            @case ('overview') {
              <div class="flex items-center gap-2">
                <h1
                  class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight"
                >
                  Hola, {{ authService.currentUser()?.name?.split(' ')?.[0] || 'Alejandro' }} 👋
                </h1>
                <button
                  type="button"
                  (click)="showProfileModal.set(true)"
                  class="p-1 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Actualizar detalles de tu perfil (foto y nombre)"
                  aria-label="Actualizar datos de usuario"
                >
                  <mat-icon class="text-base">edit</mat-icon>
                </button>
                <span
                  class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-300/40 dark:border-emerald-800/40 flex items-center gap-1"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  En línea
                </span>
              </div>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Resumen ejecutivo de flujo mensual, tesorería bancaria y límites presupuestarios.
              </p>
            }
            @case ('transacciones') {
              <div class="flex items-center gap-2">
                <h1
                  class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight"
                >
                  Historial de Transacciones
                </h1>
                <span
                  class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {{ financeService.transactions().length }} movimientos
                </span>
              </div>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Filtra por tipo, categoría o cuenta y concilia tus ingresos y gastos registrados.
              </p>
            }
            @case ('presupuestos') {
              <div class="flex items-center gap-2">
                <h1
                  class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight"
                >
                  Presupuestos & Metas
                </h1>
                @if (budgetService.unreadAlertsCount() > 0) {
                  <span
                    class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse"
                  >
                    {{ budgetService.unreadAlertsCount() }} alertas activas
                  </span>
                }
              </div>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Establece techos de gasto por categoría y recibe alertas automáticas en tiempo real.
              </p>
            }
            @case ('bancos') {
              <div class="flex items-center gap-2">
                <h1
                  class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight"
                >
                  Cuentas Bancarias
                </h1>
                <span
                  class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                >
                  PSD2 Open Banking
                </span>
              </div>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Sincronización bancaria automatizada con entidades financieras y conciliación de
                saldos.
              </p>
            }
            @case ('deudas') {
              <div class="flex items-center gap-2">
                <h1
                  class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight"
                >
                  Compras Financiadas & Cuotas
                </h1>
                <span
                  class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                >
                  Cashea · Krece · BNPL
                </span>
              </div>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Planificación de pagos quincenales, niveles de inicial y cuotas en curso con tasa
                oficial BCV.
              </p>
            }
            @case ('reportes') {
              <div class="flex items-center gap-2">
                <h1
                  class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight"
                >
                  Reportes & Exportación
                </h1>
              </div>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Genera balances completos auditables en documentos PDF estructurados o planillas
                CSV.
              </p>
            }
          }
        </div>

        <!-- Quick Action Buttons -->
        <div class="flex flex-wrap items-center gap-2">
          @if (activeTab() === 'overview') {
            <button
              (click)="showProfileModal.set(true)"
              class="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Actualizar foto de perfil, nombre y preferencias"
            >
              <mat-icon class="text-sm text-emerald-600 dark:text-emerald-400"
                >manage_accounts</mat-icon
              >
              <span>Mi Perfil</span>
            </button>

            <button
              (click)="showExportModal.set(true)"
              class="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
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
          } @else if (activeTab() === 'transacciones') {
            <button
              (click)="directExportCsv()"
              class="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <mat-icon class="text-sm text-emerald-600 dark:text-emerald-400"
                >table_chart</mat-icon
              >
              <span>Exportar CSV</span>
            </button>
            <button
              (click)="openNewTransaction()"
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <mat-icon class="text-sm">add_circle</mat-icon>
              <span>Nuevo Movimiento</span>
            </button>
          } @else if (activeTab() === 'presupuestos') {
            <button
              (click)="showCreateBudgetForm.set(!showCreateBudgetForm())"
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <mat-icon class="text-sm">{{ showCreateBudgetForm() ? 'remove' : 'add' }}</mat-icon>
              <span>{{ showCreateBudgetForm() ? 'Ocultar Formulario' : 'Nuevo Presupuesto' }}</span>
            </button>
          } @else if (activeTab() === 'bancos') {
            <button
              (click)="triggerSyncAll()"
              [disabled]="bankSyncService.isSyncingAll()"
              class="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <mat-icon
                [class.animate-spin]="bankSyncService.isSyncingAll()"
                class="text-sm text-emerald-600 dark:text-emerald-400"
                >sync</mat-icon
              >
              <span>Sincronizar Todas</span>
            </button>
            <button
              (click)="openAddBankModal()"
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <mat-icon class="text-sm">add_circle</mat-icon>
              <span>+ Nueva Cuenta</span>
            </button>
          } @else if (activeTab() === 'deudas') {
            <button
              (click)="openNewBnplPurchase()"
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <mat-icon class="text-sm">add_circle</mat-icon>
              <span>+ Nuevo Financiamiento</span>
            </button>
          } @else if (activeTab() === 'reportes') {
            <button
              (click)="directExportPdf()"
              [disabled]="isGeneratingPdf()"
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <mat-icon class="text-sm">picture_as_pdf</mat-icon>
              <span>Descargar PDF</span>
            </button>
            <button
              (click)="directExportCsv()"
              class="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <mat-icon class="text-sm text-emerald-600 dark:text-emerald-400"
                >table_chart</mat-icon
              >
              <span>Descargar CSV</span>
            </button>
          }
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 1: OVERVIEW (Panel Principal)          -->
      <!-- ========================================== -->
      @if (activeTab() === 'overview') {
        <div class="space-y-6">
          <!-- Tasa Oficial Dólar BCV Banner / Indicator Card -->
          <div
            class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 dark:from-emerald-950/40 dark:to-blue-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
          >
            <div class="flex items-center gap-3.5">
              <div
                class="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0"
              >
                <mat-icon class="text-2xl">currency_exchange</mat-icon>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider"
                  >
                    Tasa Oficial Dólar BCV
                  </span>
                  <span
                    class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold"
                  >
                    {{ bcvService.fechaValor() || 'Oficial en vivo' }}
                  </span>
                </div>
                <div class="flex flex-wrap items-baseline gap-2 mt-0.5">
                  <span class="text-xs text-slate-500 dark:text-slate-400">1 USD =</span>
                  <span
                    class="font-mono font-extrabold text-emerald-700 dark:text-emerald-400 text-base sm:text-lg"
                  >
                    Bs. {{ bcvService.dollarRate() | number: '1.2-2' }}
                  </span>
                  <span class="text-slate-400 text-xs mx-1">|</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">1 EUR =</span>
                  <span class="font-mono font-semibold text-slate-700 dark:text-slate-200 text-xs">
                    Bs. {{ bcvService.euroRate() | number: '1.2-2' }}
                  </span>
                  <span class="text-[11px] text-slate-400">({{ bcvService.source() }})</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                (click)="bcvService.loadRates(true)"
                [disabled]="bcvService.isLoading()"
                class="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <mat-icon
                  [class.animate-spin]="bcvService.isLoading()"
                  class="text-sm text-emerald-600"
                  >sync</mat-icon
                >
                <span>{{ bcvService.isLoading() ? 'Consultando...' : 'Actualizar BCV' }}</span>
              </button>
            </div>
          </div>

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
                    {{
                      alert.percentage >= 100
                        ? '¡Presupuesto Superado!'
                        : 'Alerta de Presupuesto Mensual'
                    }}
                    — {{ alert.budget.categoryName }} ({{ alert.percentage.toFixed(0) }}%)
                  </p>
                  <p class="text-xs text-slate-600 dark:text-slate-300">
                    Has gastado {{ alert.spent | currencyFormat: 'VES' }} de tu límite de
                    {{ alert.budget.monthlyLimit | currencyFormat: 'VES' }}.
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
            <div
              class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400"
                  >Balance Total</span
                >
                <div
                  class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
                >
                  <mat-icon class="text-base">account_balance_wallet</mat-icon>
                </div>
              </div>
              <div class="space-y-1">
                <p class="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {{ bankSyncService.totalBankBalance() | currencyFormat: 'VES' }}
                </p>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                    ≈ $
                    {{ bcvService.vesToUsd(bankSyncService.totalBankBalance()) | number: '1.2-2' }}
                    USD
                  </span>
                  <p
                    class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5"
                  >
                    <mat-icon class="text-xs">trending_up</mat-icon>
                    <span>+{{ financeService.netBalance() | currencyFormat: 'VES' : true }}</span>
                  </p>
                </div>
              </div>
            </div>

            <div
              class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400"
                  >Ingresos del Mes</span
                >
                <div
                  class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"
                >
                  <mat-icon class="text-base">arrow_upward</mat-icon>
                </div>
              </div>
              <div class="space-y-1">
                <p
                  class="text-2xl font-extrabold text-slate-900 dark:text-white font-mono text-emerald-600 dark:text-emerald-400"
                >
                  +{{ financeService.totalIncome() | currencyFormat: 'VES' }}
                </p>
                <p class="text-xs font-mono text-slate-500 dark:text-slate-400">
                  ≈ $ {{ bcvService.vesToUsd(financeService.totalIncome()) | number: '1.2-2' }} USD
                  @ tasa BCV
                </p>
              </div>
            </div>

            <div
              class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400"
                  >Gastos del Mes</span
                >
                <div
                  class="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center"
                >
                  <mat-icon class="text-base">arrow_downward</mat-icon>
                </div>
              </div>
              <div class="space-y-1">
                <p
                  class="text-2xl font-extrabold text-slate-900 dark:text-white font-mono text-rose-600 dark:text-rose-400"
                >
                  -{{ financeService.totalExpense() | currencyFormat: 'VES' }}
                </p>
                <div class="flex items-center justify-between text-xs">
                  <span class="font-mono text-rose-500">
                    ≈ $
                    {{ bcvService.vesToUsd(financeService.totalExpense()) | number: '1.2-2' }} USD
                  </span>
                  <span class="text-slate-400">
                    {{
                      (
                        (financeService.totalExpense() / (budgetService.totalBudgetLimit() || 1)) *
                        100
                      ).toFixed(0)
                    }}% del límite
                  </span>
                </div>
              </div>
            </div>

            <div
              class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400"
                  >Tasa de Ahorro</span
                >
                <div
                  class="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"
                >
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
                <div
                  class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
                >
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
            <div
              class="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2
                    class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"
                  >
                    <mat-icon class="text-emerald-500 text-lg">insights</mat-icon>
                    Flujo Financiero Mensual
                  </h2>
                  <p class="text-xs text-slate-400">
                    Comparativa de ingresos vs gastos y evolución del balance neto
                  </p>
                </div>
                <span
                  class="text-xs font-mono font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto"
                >
                  Últimos 6 meses
                </span>
              </div>
              <app-cash-flow-chart [data]="financeService.monthlyHistory()" />
            </div>

            <div
              class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h2
                      class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"
                    >
                      <mat-icon class="text-indigo-500 text-lg">pie_chart</mat-icon>
                      Gastos por Categoría
                    </h2>
                    <p class="text-xs text-slate-400">Desglose porcentual del mes</p>
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

          <!-- Próximos Pagos de Cuotas (Cashea / BNPL) Overview Widget -->
          <div
            class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"
                >
                  <mat-icon class="text-xl">credit_score</mat-icon>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">
                      Próximos Vencimientos de Cuotas (Cashea / BNPL)
                    </h2>
                    @if (bnplService.allPendingInstallments().length > 0) {
                      <span
                        class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300"
                      >
                        {{ bnplService.allPendingInstallments().length }} por pagar
                      </span>
                    }
                  </div>
                  <p class="text-xs text-slate-400">
                    Planificación de cuotas quincenales calculadas a tasa oficial Dólar BCV
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  (click)="openNewBnplPurchase()"
                  class="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <mat-icon class="text-xs">add</mat-icon>
                  <span>Nueva Compra</span>
                </button>
                <button
                  (click)="selectTab('deudas')"
                  class="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Ver plan completo →
                </button>
              </div>
            </div>

            <!-- Installment Cards Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              @for (
                item of bnplService.upcomingInstallments().slice(0, 3);
                track item.purchaseId + '_' + item.installment.number
              ) {
                <div
                  class="p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all"
                  [class.bg-rose-50/40]="item.isOverdue"
                  [class.dark:bg-rose-950/20]="item.isOverdue"
                  [class.border-rose-300]="item.isOverdue"
                  [class.dark:border-rose-900]="item.isOverdue"
                  [class.bg-amber-50/30]="item.isDueSoon && !item.isOverdue"
                  [class.dark:bg-amber-950/15]="item.isDueSoon && !item.isOverdue"
                  [class.border-amber-200]="item.isDueSoon && !item.isOverdue"
                  [class.dark:border-amber-900/60]="item.isDueSoon && !item.isOverdue"
                  [class.bg-slate-50/70]="!item.isDueSoon && !item.isOverdue"
                  [class.dark:bg-slate-800/40]="!item.isDueSoon && !item.isOverdue"
                  [class.border-slate-200/80]="!item.isDueSoon && !item.isOverdue"
                  [class.dark:border-slate-700/70]="!item.isDueSoon && !item.isOverdue"
                >
                  <div>
                    <div class="flex items-center justify-between text-xs mb-1.5">
                      <span
                        class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1"
                      >
                        <span
                          class="w-2 h-2 rounded-full"
                          [class.bg-rose-500]="item.isOverdue"
                          [class.bg-amber-500]="item.isDueSoon && !item.isOverdue"
                          [class.bg-slate-400]="!item.isDueSoon && !item.isOverdue"
                        ></span>
                        {{ item.providerName }} · Cuota #{{ item.installment.number }}/{{
                          item.totalInstallments
                        }}
                      </span>
                      @if (item.isOverdue) {
                        <span class="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          Vencida hace {{ Math.abs(item.daysRemaining) }}d
                        </span>
                      } @else if (item.daysRemaining === 0) {
                        <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Vence hoy
                        </span>
                      } @else {
                        <span class="text-[10px] text-slate-400 font-mono">
                          En {{ item.daysRemaining }} días
                        </span>
                      }
                    </div>

                    <p
                      class="text-xs font-bold text-slate-900 dark:text-white truncate"
                      [title]="item.itemDescription"
                    >
                      {{ item.itemDescription }}
                    </p>
                    <p class="text-[11px] text-slate-400 truncate">
                      {{ item.storeName }} · Vence {{ item.installment.dueDate }}
                    </p>
                  </div>

                  <div
                    class="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-end justify-between"
                  >
                    <div>
                      <p class="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                        $ {{ item.installment.amountUsd | number: '1.2-2' }}
                      </p>
                      <p class="text-[10px] font-mono text-slate-400">
                        ≈ Bs.
                        {{
                          item.installment.amountUsd * (bcvService.dollarRate() || 52.45)
                            | number: '1.2-2'
                        }}
                      </p>
                    </div>

                    <button
                      type="button"
                      (click)="openPayInstallmentFromPending(item)"
                      class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1 transition-all"
                    >
                      <mat-icon class="text-xs">check</mat-icon>
                      <span>Pagar</span>
                    </button>
                  </div>
                </div>
              } @empty {
                <div
                  class="col-span-1 sm:col-span-2 lg:col-span-3 p-5 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/60"
                >
                  <mat-icon class="text-2xl text-amber-500 mb-1">sentiment_satisfied_alt</mat-icon>
                  <p class="text-xs font-bold text-slate-700 dark:text-slate-200">
                    ¡Al día! No tienes cuotas pendientes
                  </p>
                  <p class="text-[11px] text-slate-400 mb-2">
                    Registra tus compras a cuotas en Cashea, Krece o CrediTotal para planificar
                    pagos quincenales.
                  </p>
                  <button
                    (click)="openNewBnplPurchase()"
                    class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                  >
                    <mat-icon class="text-xs">add</mat-icon>
                    <span>+ Registrar Compra</span>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Bottom Balanced 2-Column Grid: Linked Banks & Recent Activity -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Col 1: Cuentas Bancarias Overview -->
            <div
              class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"
                    >
                      <mat-icon class="text-base">account_balance</mat-icon>
                    </div>
                    <div>
                      <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                        Cuentas y Billeteras
                      </h3>
                      <p class="text-[11px] text-slate-400 font-mono">
                        {{ bankSyncService.connectedCount() }} registradas
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      (click)="openAddBankModal()"
                      class="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Registrar nueva cuenta o billetera"
                    >
                      <mat-icon class="text-xs">add</mat-icon>
                      <span>Nueva</span>
                    </button>
                    <button
                      (click)="selectTab('bancos')"
                      class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Ver todas →
                    </button>
                  </div>
                </div>

                <div class="space-y-2.5">
                  @for (acc of bankSyncService.accounts().slice(0, 4); track acc.id) {
                    <div
                      class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                    >
                      <div class="truncate mr-3">
                        <div class="flex items-center gap-1.5">
                          <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {{ acc.name }}
                          </p>
                          <span
                            class="text-[9px] font-bold px-1.5 py-0.2 rounded"
                            [class.bg-emerald-100]="acc.currency === 'USD'"
                            [class.text-emerald-700]="acc.currency === 'USD'"
                            [class.dark:bg-emerald-950]="acc.currency === 'USD'"
                            [class.dark:text-emerald-300]="acc.currency === 'USD'"
                            [class.bg-blue-100]="acc.currency !== 'USD'"
                            [class.text-blue-700]="acc.currency !== 'USD'"
                            [class.dark:bg-blue-950]="acc.currency !== 'USD'"
                            [class.dark:text-blue-300]="acc.currency !== 'USD'"
                          >
                            {{ acc.currency || 'VES' }}
                          </span>
                        </div>
                        <p class="text-[10px] text-slate-400 font-mono">
                          {{ acc.bankName }} · {{ acc.accountNumber }}
                        </p>
                      </div>
                      <div class="text-right shrink-0">
                        @if (acc.currency === 'USD') {
                          <p
                            class="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono"
                          >
                            $ {{ acc.balance | number: '1.2-2' }}
                          </p>
                          <span class="text-[9px] font-mono text-slate-400">
                            ≈ Bs. {{ bcvService.usdToVes(acc.balance) | number: '1.2-2' }}
                          </span>
                        } @else {
                          <p class="text-xs font-bold text-slate-900 dark:text-white font-mono">
                            {{ acc.balance | currencyFormat: 'VES' }}
                          </p>
                          <span class="text-[9px] font-mono text-slate-400">
                            ≈ $ {{ bcvService.vesToUsd(acc.balance) | number: '1.2-2' }}
                          </span>
                        }
                      </div>
                    </div>
                  } @empty {
                    <div
                      class="p-4 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/70"
                    >
                      <mat-icon class="text-2xl text-emerald-500 mb-1"
                        >account_balance_wallet</mat-icon
                      >
                      <p class="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Sin cuentas vinculadas aún
                      </p>
                      <p class="text-[11px] text-slate-400 mb-2.5">
                        Agrega tu banco nacional o billetera en USD para conciliar saldos.
                      </p>
                      <button
                        (click)="openAddBankModal()"
                        class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <mat-icon class="text-xs">add_circle</mat-icon>
                        <span>+ Registrar Cuenta</span>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <div
                class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between"
              >
                <span class="text-xs text-slate-400">Saldo global en entidades</span>
                <span class="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                  {{ bankSyncService.totalBankBalance() | currencyFormat: 'VES' }}
                </span>
              </div>
            </div>

            <!-- Col 2: Recent Activity Overview -->
            <div
              class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
                    >
                      <mat-icon class="text-base">receipt_long</mat-icon>
                    </div>
                    <div>
                      <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                        Últimos Movimientos
                      </h3>
                      <p class="text-[11px] text-slate-400 font-mono">
                        {{ financeService.transactions().length }} registrados
                      </p>
                    </div>
                  </div>
                  <button
                    (click)="selectTab('transacciones')"
                    class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Ver historial →
                  </button>
                </div>

                <div class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (tx of financeService.transactions().slice(0, 4); track tx.id) {
                    <div class="py-2.5 flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 truncate">
                        <span
                          class="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 text-xs shadow-2xs"
                          [style.backgroundColor]="tx.categoryColor || '#64748b'"
                        >
                          <mat-icon class="text-sm">{{ tx.categoryIcon || 'payments' }}</mat-icon>
                        </span>
                        <div class="truncate">
                          <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {{ tx.description }}
                          </p>
                          <p class="text-[10px] text-slate-400">
                            {{ tx.categoryName }} · {{ tx.date | dateFormat: 'short' }}
                          </p>
                        </div>
                      </div>
                      <div class="text-right shrink-0">
                        <span
                          class="font-mono font-bold text-xs block"
                          [class.text-rose-600]="tx.type === 'expense'"
                          [class.dark:text-rose-400]="tx.type === 'expense'"
                          [class.text-emerald-600]="tx.type === 'income'"
                          [class.dark:text-emerald-400]="tx.type === 'income'"
                        >
                          {{ tx.type === 'expense' ? '-' : '+'
                          }}{{ tx.amount | currencyFormat: 'VES' }}
                        </span>
                        <span
                          class="text-[10px] font-mono text-slate-500 dark:text-slate-400 block"
                        >
                          ≈ $
                          {{
                            tx.amountUsd || bcvService.vesToUsd(tx.amount, tx.exchangeRate)
                              | number: '1.2-2'
                          }}
                        </span>
                      </div>
                    </div>
                  } @empty {
                    <div
                      class="py-6 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/70"
                    >
                      <mat-icon class="text-2xl text-emerald-500 mb-1">receipt_long</mat-icon>
                      <p class="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Sin movimientos registrados
                      </p>
                      <p class="text-[11px] text-slate-400 mb-2.5">
                        Registra tu primer movimiento de ingreso o gasto.
                      </p>
                      <button
                        (click)="openNewTransaction()"
                        class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <mat-icon class="text-xs">add</mat-icon>
                        <span>Nuevo Movimiento</span>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <div
                class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between"
              >
                <span class="text-xs text-slate-400">Total ingresos este mes</span>
                <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  +{{ financeService.totalIncome() | currencyFormat: 'VES' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ========================================== -->
      <!-- TAB 2: TRANSACCIONES (Gestión completa)    -->
      <!-- ========================================== -->
      @if (activeTab() === 'transacciones') {
        <div
          class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
        >
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <mat-icon class="text-emerald-500">receipt_long</mat-icon>
                Historial Completo de Transacciones
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"
                >
                  {{ financeService.filteredTransactions().length }} movimientos
                </span>
              </h2>
              <p class="text-xs text-slate-400">
                Filtra, busca, edita o exporta todos tus gastos e ingresos registrados.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- Type Pills -->
              <div
                class="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold"
              >
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

          <!-- Info Banner for BCV Reference Rate in Transactions -->
          <div
            class="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div class="flex items-center gap-2">
              <mat-icon class="text-emerald-600 text-sm">currency_exchange</mat-icon>
              <span class="text-slate-700 dark:text-slate-300">
                Movimientos en <strong>Bolívares (VES)</strong> con conversión a
                <strong>Dólares (USD)</strong> según la tasa BCV del día.
              </span>
            </div>
            <div
              class="font-mono font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"
            >
              <span class="text-[11px] text-slate-500 dark:text-slate-400">Tasa BCV de hoy:</span>
              <span
                class="px-2 py-0.5 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs shadow-2xs"
              >
                Bs. {{ bcvService.dollarRate() | number: '1.2-2' }} / USD
              </span>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table
              class="w-full text-left border-collapse"
              aria-label="Tabla de transacciones financieras"
            >
              <thead>
                <tr
                  class="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-400"
                >
                  <th scope="col" class="py-3 px-4">Concepto</th>
                  <th scope="col" class="py-3 px-3">Categoría</th>
                  <th scope="col" class="py-3 px-3 hidden sm:table-cell">Cuenta</th>
                  <th scope="col" class="py-3 px-3 hidden md:table-cell">Fecha</th>
                  <th scope="col" class="py-3 px-3">Estado</th>
                  <th scope="col" class="py-3 px-4 text-right">Monto (VES) / USD</th>
                  <th scope="col" class="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                @for (tx of financeService.filteredTransactions(); track tx.id) {
                  <tr
                    class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <span
                          class="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                          [style.backgroundColor]="tx.categoryColor || '#64748b'"
                        >
                          <mat-icon class="text-sm">{{ tx.categoryIcon || 'payments' }}</mat-icon>
                        </span>
                        <div class="truncate max-w-[220px]">
                          <p class="font-bold text-slate-900 dark:text-white truncate">
                            {{ tx.description }}
                          </p>
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
                      <div class="flex flex-col items-end">
                        <span
                          class="font-mono font-bold text-xs sm:text-sm"
                          [class.text-rose-600]="tx.type === 'expense'"
                          [class.dark:text-rose-400]="tx.type === 'expense'"
                          [class.text-emerald-600]="tx.type === 'income'"
                          [class.dark:text-emerald-400]="tx.type === 'income'"
                        >
                          {{ tx.type === 'expense' ? '-' : '+'
                          }}{{ tx.amount | currencyFormat: 'VES' }}
                        </span>
                        <div
                          class="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] text-slate-500 dark:text-slate-400"
                        >
                          <span
                            >≈ $
                            {{
                              tx.amountUsd || bcvService.vesToUsd(tx.amount, tx.exchangeRate)
                                | number: '1.2-2'
                            }}</span
                          >
                          <span
                            class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-semibold text-slate-600 dark:text-slate-300"
                            title="Tasa de cambio BCV aplicada a esta operación"
                          >
                            @ {{ tx.exchangeRate || bcvService.dollarRate() | number: '1.2-2' }}
                          </span>
                        </div>
                      </div>
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
          <div
            class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2
                  class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"
                >
                  <mat-icon class="text-amber-500">donut_large</mat-icon>
                  Presupuestos Mensuales & Alertas Automáticas
                </h2>
                <p class="text-xs text-slate-400">
                  Controla techos de gasto y recibe avisos push automáticos al alcanzar el 75%, 90%
                  o superar el 100%.
                </p>
              </div>

              <button
                (click)="showCreateBudgetForm.set(!showCreateBudgetForm())"
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <mat-icon class="text-sm">{{ showCreateBudgetForm() ? 'remove' : 'add' }}</mat-icon>
                <span>{{
                  showCreateBudgetForm() ? 'Ocultar Formulario' : 'Nuevo Presupuesto'
                }}</span>
              </button>
            </div>

            <!-- Global Progress Bar -->
            <div
              class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
            >
              <div class="flex items-baseline justify-between mb-2">
                <div>
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400"
                    >Presupuesto Mensual Global</span
                  >
                  <p class="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                    {{ financeService.totalExpense() | currencyFormat: 'VES' }}
                    <span class="text-xs font-normal text-slate-400">
                      de {{ budgetService.totalBudgetLimit() | currencyFormat: 'VES' }}
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
              <div
                class="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
              >
                <h4
                  class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3"
                >
                  Configurar Límite Mensual para una Categoría
                </h4>

                <form
                  [formGroup]="budgetForm"
                  (ngSubmit)="onSaveBudgetInline()"
                  class="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <div>
                    <label
                      for="dash-b-category"
                      class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
                    >
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
                    <label
                      for="dash-b-limit"
                      class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
                    >
                      Límite Mensual (Bs. VES)
                    </label>
                    <input
                      id="dash-b-limit"
                      type="number"
                      step="50"
                      formControlName="monthlyLimit"
                      placeholder="15000"
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

                <div
                  class="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-2"
                >
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
                        {{
                          pct >= 100 ? 'Excedido (' + Math.round(pct) + '%)' : Math.round(pct) + '%'
                        }}
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
                    <span class="text-slate-500">Gastado: {{ spent | currencyFormat: 'VES' }}</span>
                    <span class="text-slate-800 dark:text-slate-200 font-bold">
                      Límite: {{ budget.monthlyLimit | currencyFormat: 'VES' }}
                      <span class="text-[10px] text-slate-400 font-normal">
                        (≈ $
                        {{
                          budget.monthlyLimit / (bcvService.dollarRate() || 52.45)
                            | number: '1.2-2'
                        }})
                      </span>
                    </span>
                  </div>

                  <div
                    class="w-full h-2 bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden"
                  >
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
        <div
          class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <mat-icon class="text-blue-500">account_balance</mat-icon>
                Conector Bancario & Cuentas Vinculadas
                <span
                  class="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                >
                  PSD2 Open Banking
                </span>
              </h2>
              <p class="text-xs text-slate-400">
                Sincroniza tus entidades financieras, concilia saldos e importa transacciones
                automáticamente.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                (click)="triggerSyncAll()"
                [disabled]="bankSyncService.isSyncingAll()"
                class="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <mat-icon [class.animate-spin]="bankSyncService.isSyncingAll()" class="text-sm"
                  >sync</mat-icon
                >
                <span>{{
                  bankSyncService.isSyncingAll() ? 'Sincronizando...' : 'Sincronizar Todas'
                }}</span>
              </button>

              <button
                (click)="openAddBankModal()"
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <mat-icon class="text-sm">add_circle</mat-icon>
                <span>+ Nueva Cuenta</span>
              </button>
            </div>
          </div>

          <!-- Total Bank Header -->
          <div
            class="p-4 rounded-2xl bg-gradient-to-r from-blue-900/10 via-emerald-900/10 to-teal-900/10 dark:from-blue-950/40 dark:to-teal-950/40 border border-blue-200/60 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400">Saldo Consolidado en Bancos</p>
              <div class="flex items-baseline gap-2">
                <p class="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {{ bankSyncService.totalBankBalance() | currencyFormat: 'VES' }}
                </p>
                <span class="text-xs font-mono font-bold text-slate-400">
                  (≈ $
                  {{ bcvService.vesToUsd(bankSyncService.totalBankBalance()) | number: '1.2-2' }})
                </span>
              </div>
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <mat-icon class="text-emerald-500 text-base">verified</mat-icon>
              <span
                >{{ bankSyncService.connectedCount() }} entidades verificadas y cifradas TLS
                1.3</span
              >
            </div>
          </div>

          <!-- Accounts Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (acc of bankSyncService.accounts(); track acc.id) {
              <div
                class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-3 truncate">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 font-bold text-xs"
                    [style.backgroundColor]="acc.color"
                  >
                    <mat-icon class="text-base">
                      {{
                        acc.type === 'credit'
                          ? 'credit_card'
                          : acc.type === 'wallet'
                            ? 'wallet'
                            : 'account_balance'
                      }}
                    </mat-icon>
                  </div>
                  <div class="truncate">
                    <div class="flex items-center gap-1.5">
                      <p class="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {{ acc.name }}
                      </p>
                      <span
                        class="text-[9px] font-bold px-1.5 py-0.2 rounded"
                        [class.bg-emerald-100]="acc.currency === 'USD'"
                        [class.text-emerald-700]="acc.currency === 'USD'"
                        [class.dark:bg-emerald-950]="acc.currency === 'USD'"
                        [class.dark:text-emerald-300]="acc.currency === 'USD'"
                        [class.bg-blue-100]="acc.currency !== 'USD'"
                        [class.text-blue-700]="acc.currency !== 'USD'"
                        [class.dark:bg-blue-950]="acc.currency !== 'USD'"
                        [class.dark:text-blue-300]="acc.currency !== 'USD'"
                      >
                        {{ acc.currency || 'VES' }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-400 font-mono">
                      {{ acc.bankName }} • {{ acc.accountNumber }}
                    </p>
                    <span
                      class="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium mt-0.5"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Actualizado {{ acc.lastSyncAt | dateFormat: 'relative' }}
                    </span>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  @if (acc.currency === 'USD') {
                    <p
                      class="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono"
                    >
                      $ {{ acc.balance | number: '1.2-2' }}
                    </p>
                    <p class="text-[11px] font-mono text-slate-400">
                      ≈ Bs. {{ bcvService.usdToVes(acc.balance) | number: '1.2-2' }}
                    </p>
                  } @else {
                    <p class="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                      {{ acc.balance | currencyFormat: 'VES' }}
                    </p>
                    <p class="text-[11px] font-mono text-slate-400">
                      ≈ $ {{ bcvService.vesToUsd(acc.balance) | number: '1.2-2' }}
                    </p>
                  }
                  <div class="flex items-center justify-end gap-1 mt-1">
                    <button
                      (click)="bankSyncService.syncAccount(acc.id)"
                      class="p-1 text-slate-400 hover:text-blue-500 rounded-lg cursor-pointer transition-colors"
                      title="Sincronizar cuenta"
                    >
                      <mat-icon class="text-sm">sync</mat-icon>
                    </button>
                    <button
                      (click)="bankSyncService.removeAccount(acc.id)"
                      class="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer transition-colors"
                      title="Desvincular"
                    >
                      <mat-icon class="text-sm">delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            } @empty {
              <div
                class="col-span-1 md:col-span-2 p-8 text-center rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/70"
              >
                <div
                  class="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3"
                >
                  <mat-icon class="text-2xl">account_balance_wallet</mat-icon>
                </div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                  Aún no tienes cuentas registradas
                </h3>
                <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                  Agrega cuentas bancarias nacionales en Bolívares (VES), billeteras digitales en
                  Dólares (USD) o efectivo con su saldo inicial.
                </p>
                <button
                  (click)="openAddBankModal()"
                  class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-emerald-600/25 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">add_circle</mat-icon>
                  <span>+ Registrar Primera Cuenta</span>
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- ========================================== -->
      <!-- TAB 5: REPORTES PDF / CSV                  -->
      <!-- ========================================== -->
      @if (activeTab() === 'reportes') {
        <div
          class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6"
        >
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <mat-icon class="text-emerald-500">description</mat-icon>
              Exportación de Reportes Financieros
            </h2>
            <p class="text-xs text-slate-400">
              Genera documentos ejecutivos en PDF con tasa Dólar BCV o exporta hojas de datos
              tabulares CSV para Excel y Google Sheets.
            </p>
          </div>

          <!-- Preview Metrics Box -->
          <div
            class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
          >
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2"
              >Datos del Período Actual</span
            >
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div
                class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
              >
                <span class="text-[10px] uppercase font-bold text-slate-400 block"
                  >Total Ingresos</span
                >
                <span class="text-sm font-bold text-emerald-600 font-mono"
                  >+{{ financeService.totalIncome() | currencyFormat: 'VES' }}</span
                >
              </div>
              <div
                class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
              >
                <span class="text-[10px] uppercase font-bold text-slate-400 block"
                  >Total Gastos</span
                >
                <span class="text-sm font-bold text-rose-600 font-mono"
                  >-{{ financeService.totalExpense() | currencyFormat: 'VES' }}</span
                >
              </div>
              <div
                class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
              >
                <span class="text-[10px] uppercase font-bold text-slate-400 block"
                  >Balance Neto</span
                >
                <span class="text-sm font-bold text-blue-600 font-mono">{{
                  financeService.netBalance() | currencyFormat: 'VES' : true
                }}</span>
              </div>
              <div
                class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
              >
                <span class="text-[10px] uppercase font-bold text-slate-400 block"
                  >Tasa Ahorro</span
                >
                <span class="text-sm font-bold text-indigo-600 font-mono"
                  >{{ financeService.savingsRate() }}%</span
                >
              </div>
            </div>
          </div>

          <!-- Direct Download Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- PDF Card -->
            <div
              class="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 flex flex-col justify-between gap-4 transition-all"
            >
              <div class="flex items-start gap-3.5">
                <div
                  class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0"
                >
                  <mat-icon class="text-2xl">picture_as_pdf</mat-icon>
                </div>
                <div>
                  <h3
                    class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5"
                  >
                    Informe Financiero Formal (PDF)
                    <span
                      class="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded"
                    >
                      A4
                    </span>
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Documento formal con membrete institucional, resumen ejecutivo, tabla de
                    distribución y movimientos detallados.
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
            <div
              class="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 flex flex-col justify-between gap-4 transition-all"
            >
              <div class="flex items-start gap-3.5">
                <div
                  class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
                >
                  <mat-icon class="text-2xl">table_chart</mat-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                    Hoja de Datos Tabular (CSV)
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Exporta todas tus transacciones con codificación UTF-8 compatible con Microsoft
                    Excel, Google Sheets y Numbers.
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

      <!-- ========================================== -->
      <!-- TAB 6: DEUDAS Y COMPRAS FINANCIADAS (BNPL) -->
      <!-- ========================================== -->
      @if (activeTab() === 'deudas') {
        <div class="space-y-6">
          <!-- BNPL Overview Metrics Header -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- 1. Deuda Total Pendiente -->
            <div
              class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
            >
              <div
                class="flex items-center justify-between text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider"
              >
                <span>Deuda Total Pendiente</span>
                <mat-icon class="text-amber-500 text-base">pending_actions</mat-icon>
              </div>
              <p class="text-2xl font-black font-mono text-slate-900 dark:text-white">
                $ {{ bnplService.totalPendingDebtUsd() | number: '1.2-2' }}
              </p>
              <p class="text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold mt-1">
                ≈ {{ bnplService.totalPendingDebtVes() | currencyFormat: 'VES' }} (BCV)
              </p>
            </div>

            <!-- 2. Próximo Vencimiento -->
            <div
              class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
            >
              <div
                class="flex items-center justify-between text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider"
              >
                <span>Próximo Vencimiento</span>
                <mat-icon class="text-rose-500 text-base">event_upcoming</mat-icon>
              </div>
              @if (bnplService.nextDueInstallment(); as next) {
                <p class="text-lg font-black font-mono text-slate-900 dark:text-white truncate">
                  $ {{ next.installment.amountUsd | number: '1.2-2' }} USD
                </p>
                <div
                  class="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400"
                >
                  <span class="font-bold text-slate-700 dark:text-slate-300">{{
                    next.installment.dueDate
                  }}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    [class.text-rose-600]="next.isOverdue"
                    [class.text-amber-600]="next.isDueSoon && !next.isOverdue"
                  >
                    {{
                      next.isOverdue
                        ? 'Vencida'
                        : next.daysRemaining === 0
                          ? 'Vence hoy'
                          : 'En ' + next.daysRemaining + ' días'
                    }}
                  </span>
                </div>
              } @else {
                <p class="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  ¡Al día! Sin cuotas pendientes
                </p>
              }
            </div>

            <!-- 3. Total Cuotas Pendientes -->
            <div
              class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
            >
              <div
                class="flex items-center justify-between text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider"
              >
                <span>Cuotas por Cancelar</span>
                <mat-icon class="text-blue-500 text-base">format_list_numbered</mat-icon>
              </div>
              <p class="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {{ bnplService.allPendingInstallments().length }}
              </p>
              <p class="text-xs text-slate-400 mt-1">
                En {{ bnplService.activePurchasesCount() }} compras activas
              </p>
            </div>

            <!-- 4. Total Pagado a la Fecha -->
            <div
              class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
            >
              <div
                class="flex items-center justify-between text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider"
              >
                <span>Total Amortizado</span>
                <mat-icon class="text-emerald-500 text-base">verified</mat-icon>
              </div>
              <p class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                $ {{ bnplService.totalPaidDebtUsd() | number: '1.2-2' }}
              </p>
              <p class="text-xs text-slate-400 mt-1">Iniciales y cuotas liquidadas</p>
            </div>
          </div>

          <!-- Section Content: Filter Tabs & Purchases List -->
          <div
            class="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2
                  class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"
                >
                  <mat-icon class="text-amber-500">shopping_bag</mat-icon>
                  Historial de Financiamientos en Cuotas
                </h2>
                <p class="text-xs text-slate-400">
                  Control quincenal de Cashea, Krece, CrediTotal y compras con pago aplazado.
                </p>
              </div>

              <!-- Filter tabs & New Button -->
              <div class="flex flex-wrap items-center gap-2">
                <div
                  class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold"
                >
                  <button
                    type="button"
                    (click)="bnplService.selectedProviderFilter.set('all')"
                    class="px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    [class.bg-white]="bnplService.selectedProviderFilter() === 'all'"
                    [class.text-slate-900]="bnplService.selectedProviderFilter() === 'all'"
                    [class.dark:bg-slate-700]="bnplService.selectedProviderFilter() === 'all'"
                    [class.dark:text-white]="bnplService.selectedProviderFilter() === 'all'"
                    [class.text-slate-500]="bnplService.selectedProviderFilter() !== 'all'"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    (click)="bnplService.selectedProviderFilter.set('cashea')"
                    class="px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    [class.bg-white]="bnplService.selectedProviderFilter() === 'cashea'"
                    [class.text-amber-600]="bnplService.selectedProviderFilter() === 'cashea'"
                    [class.dark:bg-slate-700]="bnplService.selectedProviderFilter() === 'cashea'"
                    [class.text-slate-500]="bnplService.selectedProviderFilter() !== 'cashea'"
                  >
                    Cashea
                  </button>
                  <button
                    type="button"
                    (click)="bnplService.selectedProviderFilter.set('krece')"
                    class="px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    [class.bg-white]="bnplService.selectedProviderFilter() === 'krece'"
                    [class.text-purple-600]="bnplService.selectedProviderFilter() === 'krece'"
                    [class.dark:bg-slate-700]="bnplService.selectedProviderFilter() === 'krece'"
                    [class.text-slate-500]="bnplService.selectedProviderFilter() !== 'krece'"
                  >
                    Krece
                  </button>
                  <button
                    type="button"
                    (click)="bnplService.selectedProviderFilter.set('creditotal')"
                    class="px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    [class.bg-white]="bnplService.selectedProviderFilter() === 'creditotal'"
                    [class.text-cyan-600]="bnplService.selectedProviderFilter() === 'creditotal'"
                    [class.dark:bg-slate-700]="
                      bnplService.selectedProviderFilter() === 'creditotal'
                    "
                    [class.text-slate-500]="bnplService.selectedProviderFilter() !== 'creditotal'"
                  >
                    CrediTotal
                  </button>
                </div>

                <button
                  type="button"
                  (click)="openNewBnplPurchase()"
                  class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="text-sm">add_circle</mat-icon>
                  <span>+ Nuevo Financiamiento</span>
                </button>
              </div>
            </div>

            <!-- Purchases list -->
            <div class="space-y-4">
              @for (purchase of bnplService.filteredPurchases(); track purchase.id) {
                @let paidCount = getPaidInstallmentsCount(purchase);
                @let pct = (paidCount / purchase.installmentsCount) * 100;

                <div
                  class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4"
                >
                  <!-- Purchase Card Header -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <div
                        class="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs font-bold"
                        [style.backgroundColor]="getProviderColor(purchase.providerId)"
                      >
                        <mat-icon class="text-xl">{{
                          getProviderIcon(purchase.providerId)
                        }}</mat-icon>
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                            {{ purchase.itemDescription }}
                          </h3>
                          <span
                            class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            [class.bg-emerald-100]="purchase.status === 'completed'"
                            [class.text-emerald-700]="purchase.status === 'completed'"
                            [class.dark:bg-emerald-950]="purchase.status === 'completed'"
                            [class.dark:text-emerald-300]="purchase.status === 'completed'"
                            [class.bg-amber-100]="purchase.status === 'active'"
                            [class.text-amber-800]="purchase.status === 'active'"
                            [class.dark:bg-amber-950]="purchase.status === 'active'"
                            [class.dark:text-amber-300]="purchase.status === 'active'"
                          >
                            {{ purchase.status === 'completed' ? 'Completado' : 'En Curso' }}
                          </span>
                        </div>
                        <div
                          class="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5"
                        >
                          <span class="font-semibold text-slate-700 dark:text-slate-300">{{
                            purchase.storeName
                          }}</span>
                          <span aria-hidden="true">·</span>
                          <span>{{ purchase.providerName }}</span>
                          <span aria-hidden="true">·</span>
                          <span>Comprado el {{ purchase.purchaseDate }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-4 self-end sm:self-auto">
                      <div class="text-right">
                        <p class="text-base font-black font-mono text-slate-900 dark:text-white">
                          $ {{ purchase.totalAmountUsd | number: '1.2-2' }} USD
                        </p>
                        <p class="text-[11px] text-slate-400 font-mono">
                          Inicial: $ {{ purchase.downPaymentUsd | number: '1.2-2' }} ({{
                            purchase.downPaymentPercent
                          }}%)
                        </p>
                      </div>

                      <button
                        type="button"
                        (click)="bnplService.deletePurchase(purchase.id)"
                        class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar registro"
                        aria-label="Eliminar registro de financiamiento"
                      >
                        <mat-icon class="text-base">delete_outline</mat-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs font-mono">
                      <span class="text-slate-500">
                        Progreso:
                        <strong>{{ paidCount }} de {{ purchase.installmentsCount }} cuotas</strong>
                        pagadas
                      </span>
                      <span class="font-bold text-slate-800 dark:text-slate-200"
                        >{{ pct | number: '1.0-0' }}% amortizado</span
                      >
                    </div>
                    <div
                      class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                    >
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        [style.width.%]="pct"
                        [class.bg-emerald-500]="pct === 100"
                        [class.bg-amber-500]="pct < 100"
                      ></div>
                    </div>
                  </div>

                  <!-- Installments Schedule Timeline Cards -->
                  <div class="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2.5">
                      Cronograma de Pagos Quincenales
                    </span>

                    <div
                      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5"
                    >
                      @for (inst of purchase.installments; track inst.number) {
                        <div
                          class="p-3 rounded-xl border flex flex-col justify-between gap-2 text-xs"
                          [class.bg-emerald-50/50]="inst.status === 'paid'"
                          [class.dark:bg-emerald-950/20]="inst.status === 'paid'"
                          [class.border-emerald-200]="inst.status === 'paid'"
                          [class.dark:border-emerald-900/60]="inst.status === 'paid'"
                          [class.bg-white]="inst.status === 'pending'"
                          [class.dark:bg-slate-900/80]="inst.status === 'pending'"
                          [class.border-slate-200]="inst.status === 'pending'"
                          [class.dark:border-slate-700]="inst.status === 'pending'"
                        >
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-slate-800 dark:text-slate-200">
                              Cuota #{{ inst.number }}/{{ purchase.installmentsCount }}
                            </span>
                            @if (inst.status === 'paid') {
                              <span
                                class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"
                              >
                                <mat-icon class="text-xs">check_circle</mat-icon>
                                Pagada
                              </span>
                            } @else {
                              <span class="text-[10px] font-semibold text-slate-400">
                                Pendiente
                              </span>
                            }
                          </div>

                          <div>
                            <p class="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              Vence: <strong>{{ inst.dueDate }}</strong>
                            </p>
                            <p
                              class="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5"
                            >
                              $ {{ inst.amountUsd | number: '1.2-2' }} USD
                            </p>
                            <p class="font-mono text-[10px] text-slate-400">
                              ≈ Bs.
                              {{
                                inst.amountUsd * (bcvService.dollarRate() || 52.45)
                                  | number: '1.2-2'
                              }}
                            </p>
                          </div>

                          @if (inst.status === 'pending') {
                            <button
                              type="button"
                              (click)="openPayPurchaseInstallment(purchase, inst)"
                              class="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1 transition-all"
                            >
                              <mat-icon class="text-xs">payments</mat-icon>
                              <span>Pagar Cuota</span>
                            </button>
                          } @else if (inst.accountName) {
                            <p
                              class="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono truncate"
                              [title]="inst.accountName"
                            >
                              Pagado con {{ inst.accountName }}
                            </p>
                          }
                        </div>
                      }
                    </div>
                  </div>
                </div>
              } @empty {
                <div
                  class="p-10 text-center rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/60"
                >
                  <div
                    class="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3"
                  >
                    <mat-icon class="text-3xl">credit_score</mat-icon>
                  </div>
                  <h3 class="text-base font-bold text-slate-900 dark:text-white">
                    Sin Compras Financiadas Registradas
                  </h3>
                  <p class="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                    Comienza a planificar tus compras a cuotas de Cashea, Krece, CrediTotal o deudas
                    en curso para calcular con precisión tus pagos quincenales y saldos.
                  </p>
                  <button
                    type="button"
                    (click)="openNewBnplPurchase()"
                    class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-600/20 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <mat-icon class="text-sm">add_circle</mat-icon>
                    <span>+ Registrar Primer Financiamiento</span>
                  </button>
                </div>
              }
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
      <app-bank-sync-modal
        [initialMode]="bankModalMode()"
        (closeModal)="showBankModal.set(false)"
      />
    }

    @if (showBudgetModal()) {
      <app-budget-manager-modal (closeModal)="showBudgetModal.set(false)" />
    }

    @if (showExportModal()) {
      <app-export-modal (closeModal)="showExportModal.set(false)" />
    }

    @if (showProfileModal()) {
      <app-user-profile-modal (closeModal)="showProfileModal.set(false)" />
    }

    @if (showBnplPurchaseModal()) {
      <app-bnpl-purchase-modal (closeModal)="showBnplPurchaseModal.set(false)" />
    }

    @if (showBnplPayModal() && payTarget()) {
      <app-bnpl-pay-modal [target]="payTarget()!" (closeModal)="showBnplPayModal.set(false)" />
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
  readonly bcvService = inject(BcvService);
  readonly bnplService = inject(BnplService);

  readonly Math = Math;

  // Active section tab
  readonly activeTab = signal<DashboardTab>('overview');

  readonly currentTabTitle = computed(() => {
    switch (this.activeTab()) {
      case 'transacciones':
        return 'Transacciones';
      case 'presupuestos':
        return 'Presupuestos';
      case 'bancos':
        return 'Cuentas Bancarias';
      case 'deudas':
        return 'Compras Financiadas';
      case 'reportes':
        return 'Reportes PDF / CSV';
      default:
        return 'Panel Principal';
    }
  });

  // Modals state
  readonly showTransactionModal = signal<boolean>(false);
  readonly showBankModal = signal<boolean>(false);
  readonly bankModalMode = signal<'list' | 'create'>('list');
  readonly showBudgetModal = signal<boolean>(false);
  readonly showExportModal = signal<boolean>(false);
  readonly showProfileModal = signal<boolean>(false);
  readonly showBnplPurchaseModal = signal<boolean>(false);
  readonly showBnplPayModal = signal<boolean>(false);
  readonly payTarget = signal<PayModalTarget | null>(null);

  readonly showCreateBudgetForm = signal<boolean>(false);
  readonly isGeneratingPdf = signal<boolean>(false);
  readonly editingTransaction = signal<Transaction | null>(null);

  openAddBankModal(): void {
    this.bankModalMode.set('create');
    this.showBankModal.set(true);
  }

  openBankListModal(): void {
    this.bankModalMode.set('list');
    this.showBankModal.set(true);
  }

  openNewBnplPurchase(): void {
    this.showBnplPurchaseModal.set(true);
  }

  openPayInstallment(target: PayModalTarget): void {
    this.payTarget.set(target);
    this.showBnplPayModal.set(true);
  }

  openPayInstallmentFromPending(item: PendingInstallmentItem): void {
    this.openPayInstallment({
      purchaseId: item.purchaseId,
      installment: item.installment,
      totalInstallments: item.totalInstallments,
      itemDescription: item.itemDescription,
      storeName: item.storeName,
      providerName: item.providerName,
    });
  }

  openPayPurchaseInstallment(purchase: BnplPurchase, inst: BnplInstallment): void {
    this.openPayInstallment({
      purchaseId: purchase.id,
      installment: inst,
      totalInstallments: purchase.installmentsCount,
      itemDescription: purchase.itemDescription,
      storeName: purchase.storeName,
      providerName: purchase.providerName,
    });
  }

  getPaidInstallmentsCount(purchase: BnplPurchase): number {
    return purchase.installments.filter((i) => i.status === 'paid').length;
  }

  getProviderColor(providerId: string): string {
    const p = this.bnplService.providers().find((item) => item.id === providerId);
    return p?.color || '#eab308';
  }

  getProviderIcon(providerId: string): string {
    const p = this.bnplService.providers().find((item) => item.id === providerId);
    return p?.icon || 'credit_score';
  }

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
      if (
        tabParam &&
        ['overview', 'transacciones', 'presupuestos', 'bancos', 'deudas', 'reportes'].includes(
          tabParam,
        )
      ) {
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
          'Pago Móvil / Transferencia Interbancaria Recibida',
          1835.75,
          'income',
          'cat_other_income',
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
        currency: 'VES',
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
        'picture_as_pdf',
      );
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }

  directExportCsv(): void {
    CsvExporter.exportTransactions(
      this.financeService.transactions(),
      `fintrack_movimientos_${new Date().toISOString().slice(0, 10)}.csv`,
    );

    this.notificationService.sendNotification(
      'Archivo CSV Generado',
      'Tus transacciones se han exportado en archivo CSV para Excel o Google Sheets.',
      'system',
      'table_chart',
    );
  }
}
