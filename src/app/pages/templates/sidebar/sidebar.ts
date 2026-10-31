import { Component, inject, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BrandLink } from './brand-link/brand-link';
import { NavLinkItem } from './nav-link-item/nav-link-item';
import { AuthService } from '../../../services/auth.service';
import { FinanceService } from '../../../services/finance.service';
import { BankSyncService } from '../../../services/bank-sync.service';
import { BudgetService } from '../../../services/budget.service';
import { ThemeService } from '../../../services/theme.service';
import { BcvService } from '../../../services/bcv.service';
import { BnplService } from '../../../services/bnpl.service';
import { CurrencyFormatPipe } from '../../../core/pipes/currency-format.pipe';

@Component({
  selector: 'app-sidebar',
  imports: [BrandLink, NavLinkItem, MatIconModule, DecimalPipe, CurrencyFormatPipe],
  template: `
    <aside class="w-[315px] h-full flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-4 select-none">
      <!-- Top brand & navigation -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <app-brand-link />
          <button
            (click)="closeSidebar.emit()"
            class="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar menú"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <nav class="space-y-1.5" aria-label="Navegación principal">
          <app-nav-link-item
            route="/dashboard"
            label="Panel Principal"
            icon="dashboard"
            [exact]="true"
            (click)="closeSidebar.emit()"
          />
          <app-nav-link-item
            route="/dashboard/transacciones"
            label="Transacciones"
            icon="receipt_long"
            [badge]="financeService.transactions().length"
            badgeClass="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold"
            (click)="closeSidebar.emit()"
          />
          <app-nav-link-item
            route="/dashboard/presupuestos"
            label="Presupuestos"
            icon="donut_large"
            [badge]="budgetService.unreadAlertsCount() > 0 ? budgetService.unreadAlertsCount() : null"
            badgeClass="bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-mono font-bold"
            (click)="closeSidebar.emit()"
          />
          <app-nav-link-item
            route="/dashboard/bancos"
            label="Cuentas Bancarias"
            icon="account_balance"
            [badge]="bankSyncService.connectedCount()"
            badgeClass="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-mono font-bold"
            (click)="closeSidebar.emit()"
          />
          <app-nav-link-item
            route="/dashboard/deudas"
            label="Compras Financiadas"
            icon="credit_score"
            [badge]="bnplService.allPendingInstallments().length > 0 ? bnplService.allPendingInstallments().length : null"
            badgeClass="bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-mono font-bold"
            (click)="closeSidebar.emit()"
          />
          <app-nav-link-item
            route="/dashboard/reportes"
            label="Reportes PDF / CSV"
            icon="description"
            (click)="closeSidebar.emit()"
          />
        </nav>

        <!-- Linked Bank Status Mini-Card -->
        <div class="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/90 dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Open Banking
            </span>
            <span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Sincronizado
            </span>
          </div>

          <div class="flex items-baseline justify-between">
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400">Saldo Global</p>
              <p class="text-base font-bold text-slate-900 dark:text-white font-mono">
                {{ bankSyncService.totalBankBalance() | currencyFormat: 'VES' }}
              </p>
              <p class="text-[10px] font-mono text-slate-400">
                ≈ $ {{ (bankSyncService.totalBankBalance() / (bcvService.dollarRate() || 52.45)) | number:'1.2-2' }} USD
              </p>
            </div>
            <button
              (click)="bankSyncService.syncAllAccounts()"
              [disabled]="bankSyncService.isSyncingAll()"
              class="p-2 rounded-xl bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-600 transition-all cursor-pointer disabled:opacity-50"
              title="Sincronizar cuentas ahora"
              aria-label="Sincronizar cuentas bancarias"
            >
              <mat-icon [class.animate-spin]="bankSyncService.isSyncingAll()">sync</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom controls & User Profile -->
      <div class="space-y-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
        <!-- Theme toggle -->
        <div class="flex items-center justify-between px-2 py-1.5">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <mat-icon class="text-base">{{ themeService.isDarkMode() ? 'dark_mode' : 'light_mode' }}</mat-icon>
            Modo {{ themeService.isDarkMode() ? 'Oscuro' : 'Claro' }}
          </span>
          <button
            (click)="themeService.toggleDarkMode()"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-200 dark:bg-emerald-600 cursor-pointer"
            aria-label="Alternar modo claro y oscuro"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs"
              [class]="themeService.isDarkMode() ? 'translate-x-6' : 'translate-x-1'"
            ></span>
          </button>
        </div>

        <!-- User profile pill -->
        @if (authService.currentUser(); as user) {
          <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
            <button
              type="button"
              (click)="openProfileModal.emit(); closeSidebar.emit()"
              class="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-85 transition-opacity cursor-pointer flex-1 mr-1.5 group"
              title="Actualizar detalles del usuario (nombre y foto)"
              aria-label="Editar perfil de usuario"
            >
              <div class="relative shrink-0">
                <img
                  [src]="user.avatar"
                  [alt]="user.name"
                  referrerpolicy="no-referrer"
                  class="w-9 h-9 rounded-full object-cover border border-emerald-500/50 group-hover:scale-105 transition-transform"
                />
                <span class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] shadow-xs">
                  <mat-icon class="text-[10px]">edit</mat-icon>
                </span>
              </div>
              <div class="flex flex-col truncate">
                <span class="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {{ user.name }}
                </span>
                <span class="text-[11px] text-slate-400 truncate">
                  {{ user.email }}
                </span>
              </div>
            </button>

            <div class="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                (click)="openProfileModal.emit(); closeSidebar.emit()"
                class="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                title="Editar perfil"
                aria-label="Editar perfil de usuario"
              >
                <mat-icon class="text-lg">manage_accounts</mat-icon>
              </button>
              <button
                type="button"
                (click)="authService.logout()"
                class="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <mat-icon class="text-lg">logout</mat-icon>
              </button>
            </div>
          </div>
        }
      </div>
    </aside>
  `,
})
export class Sidebar {
  readonly authService = inject(AuthService);
  readonly financeService = inject(FinanceService);
  readonly bankSyncService = inject(BankSyncService);
  readonly budgetService = inject(BudgetService);
  readonly themeService = inject(ThemeService);
  readonly bcvService = inject(BcvService);
  readonly bnplService = inject(BnplService);

  readonly closeSidebar = output<void>();
  readonly openProfileModal = output<void>();
}
