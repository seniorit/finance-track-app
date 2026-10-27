import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Sidebar } from '../sidebar/sidebar';
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';
import { TransactionModal } from '../../views/feature-components/transaction-modal';
import { FinanceService } from '../../../services/finance.service';
import { BankSyncService } from '../../../services/bank-sync.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Sidebar, Navbar, Footer, TransactionModal, MatIconModule],
  template: `
    <div class="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <!-- Desktop Sidebar -->
      <div class="hidden md:block shrink-0 sticky top-0 h-screen">
        <app-sidebar />
      </div>

      <!-- Mobile Slide-over Drawer Backdrop & Sidebar -->
      @if (mobileMenuOpen()) {
        <div
          class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación móvil"
          tabindex="0"
          (keydown.escape)="mobileMenuOpen.set(false)"
          (click)="mobileMenuOpen.set(false)"
        >
          <div
            class="w-72 h-full bg-white dark:bg-slate-900 shadow-2xl transition-transform"
            tabindex="0"
            role="region"
            aria-label="Panel lateral"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <app-sidebar (closeSidebar)="mobileMenuOpen.set(false)" />
          </div>
        </div>
      }

      <!-- Main Column -->
      <div class="flex-1 flex flex-col min-w-0 min-h-screen pb-16 md:pb-0">
        <!-- Sticky Navbar -->
        <app-navbar
          (openMobileMenu)="mobileMenuOpen.set(true)"
          (openAddTx)="showAddModal.set(true)"
        />

        <!-- Page View Outlet -->
        <main class="flex-1 p-4 sm:p-6 lg:p-8" role="main">
          <router-outlet />
        </main>

        <!-- Footer -->
        <app-footer />
      </div>

      <!-- Mobile Bottom Navigation Bar (Accessible on mobile) -->
      <div class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-around shadow-lg">
        <a
          routerLink="/dashboard"
          [routerLinkActiveOptions]="{ exact: true }"
          routerLinkActive="text-emerald-600 dark:text-emerald-400 font-bold"
          class="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <mat-icon class="text-xl">dashboard</mat-icon>
          <span>Inicio</span>
        </a>

        <a
          routerLink="/dashboard/transacciones"
          routerLinkActive="text-emerald-600 dark:text-emerald-400 font-bold"
          class="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <mat-icon class="text-xl">receipt_long</mat-icon>
          <span>Movimientos</span>
        </a>

        <!-- FAB in center -->
        <button
          (click)="showAddModal.set(true)"
          class="w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform cursor-pointer"
          aria-label="Registrar nuevo movimiento"
        >
          <mat-icon class="text-2xl">add</mat-icon>
        </button>

        <a
          routerLink="/dashboard/bancos"
          routerLinkActive="text-emerald-600 dark:text-emerald-400 font-bold"
          class="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <mat-icon class="text-xl">account_balance</mat-icon>
          <span>Bancos</span>
        </a>

        <a
          routerLink="/dashboard/presupuestos"
          routerLinkActive="text-emerald-600 dark:text-emerald-400 font-bold"
          class="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <mat-icon class="text-xl">donut_large</mat-icon>
          <span>Metas</span>
        </a>
      </div>

      <!-- Quick Add Transaction Modal triggered from Layout -->
      @if (showAddModal()) {
        <app-transaction-modal (closeModal)="showAddModal.set(false)" />
      }
    </div>
  `,
})
export class Layout {
  readonly financeService = inject(FinanceService);
  readonly bankSyncService = inject(BankSyncService);

  readonly mobileMenuOpen = signal<boolean>(false);
  readonly showAddModal = signal<boolean>(false);
}
