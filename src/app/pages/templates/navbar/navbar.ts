import { Component, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FinanceService } from '../../../services/finance.service';
import { BankSyncService } from '../../../services/bank-sync.service';
import { NotificationService } from '../../../services/notification.service';
import { ThemeService } from '../../../services/theme.service';
import { DateFormatPipe } from '../../../core/pipes/date-format.pipe';

@Component({
  selector: 'app-navbar',
  imports: [MatIconModule, DateFormatPipe],
  template: `
    <header class="h-16 px-4 md:px-6 flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 transition-colors">
      <!-- Left side: Hamburger button + Search -->
      <div class="flex items-center gap-3 flex-1 max-w-xl">
        <button
          (click)="openMobileMenu.emit()"
          class="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Abrir menú"
        >
          <mat-icon>menu</mat-icon>
        </button>

        <!-- Search Input -->
        <div class="relative w-full max-w-md hidden sm:block">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <mat-icon class="text-lg">search</mat-icon>
          </div>
          <input
            type="text"
            [value]="financeService.searchQuery()"
            (input)="onSearchInput($event)"
            placeholder="Buscar transacciones, categorías, cuentas..."
            class="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition-all"
          />
          @if (financeService.searchQuery()) {
            <button
              (click)="financeService.searchQuery.set('')"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- Right side: Quick actions & Push Notifications & Theme -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Push Permission Button (shown if supported and not yet granted) -->
        @if (notificationService.pushSupported() && !notificationService.hasPushPermission()) {
          <button
            (click)="notificationService.requestPushPermission()"
            class="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
            title="Activar notificaciones push en tu navegador"
          >
            <mat-icon class="text-base text-amber-600">notifications_active</mat-icon>
            <span>Activar Push</span>
          </button>
        }

        <!-- Bank Sync Button -->
        <button
          (click)="triggerSync()"
          [disabled]="bankSyncService.isSyncingAll()"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all cursor-pointer disabled:opacity-60"
          title="Sincronizar cuentas bancarias"
        >
          <mat-icon [class.animate-spin]="bankSyncService.isSyncingAll()" class="text-base text-emerald-600 dark:text-emerald-400">
            sync
          </mat-icon>
          <span class="hidden md:inline">
            {{ bankSyncService.isSyncingAll() ? 'Sincronizando...' : 'Sincronizar Bancos' }}
          </span>
        </button>

        <!-- New Transaction Primary CTA -->
        <button
          (click)="openAddTx.emit()"
          class="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
        >
          <mat-icon class="text-base">add</mat-icon>
          <span>Nuevo Movimiento</span>
        </button>

        <!-- Notification Bell Dropdown Button -->
        <div class="relative">
          <button
            (click)="toggleNotifications()"
            class="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer"
            aria-label="Ver notificaciones push"
          >
            <mat-icon>notifications</mat-icon>
            @if (notificationService.unreadCount() > 0) {
              <span class="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-bounce">
                {{ notificationService.unreadCount() }}
              </span>
            }
          </button>

          <!-- Notifications Dropdown Popover -->
          @if (isNotificationsOpen()) {
            <div
              class="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-12 w-[calc(100vw-1rem)] sm:w-96 max-h-[80vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 flex flex-col"
            >
              <!-- Header -->
              <div class="p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-emerald-500 text-lg">notifications_active</mat-icon>
                  <span class="text-sm font-bold text-slate-900 dark:text-white">Notificaciones Push</span>
                  @if (notificationService.unreadCount() > 0) {
                    <span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {{ notificationService.unreadCount() }} nuevas
                    </span>
                  }
                </div>
                <div class="flex items-center gap-1">
                  @if (notificationService.unreadCount() > 0) {
                    <button
                      (click)="notificationService.markAllAsRead()"
                      class="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                    >
                      Leídas
                    </button>
                  }
                  <button
                    (click)="isNotificationsOpen.set(false)"
                    class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                    aria-label="Cerrar notificaciones"
                  >
                    <mat-icon class="text-base">close</mat-icon>
                  </button>
                </div>
              </div>

              <!-- List -->
              <div class="overflow-y-auto max-h-[380px] divide-y divide-slate-100 dark:divide-slate-800">
                @for (item of notificationService.notifications(); track item.id) {
                  <div
                    class="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3 relative"
                    [class.bg-emerald-50/40]="!item.read"
                    [class.dark:bg-emerald-950/20]="!item.read"
                  >
                    <div
                      class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      [class.bg-amber-100]="item.type === 'budget_alert'"
                      [class.text-amber-600]="item.type === 'budget_alert'"
                      [class.bg-blue-100]="item.type === 'bank_sync'"
                      [class.text-blue-600]="item.type === 'bank_sync'"
                      [class.bg-emerald-100]="item.type === 'transaction' || item.type === 'system'"
                      [class.text-emerald-600]="item.type === 'transaction' || item.type === 'system'"
                    >
                      <mat-icon class="text-base">{{ item.icon || 'info' }}</mat-icon>
                    </div>

                    <div class="flex-1 min-w-0 pr-4">
                      <div class="flex items-baseline justify-between gap-1">
                        <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {{ item.title }}
                        </p>
                        <span class="text-[10px] text-slate-400 whitespace-nowrap">
                          {{ item.timestamp | dateFormat: 'relative' }}
                        </span>
                      </div>
                      <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                        {{ item.body }}
                      </p>
                    </div>

                    <button
                      (click)="notificationService.deleteNotification(item.id)"
                      class="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-500 dark:hover:text-slate-300"
                      title="Eliminar"
                      aria-label="Eliminar notificación"
                    >
                      <mat-icon class="text-sm">close</mat-icon>
                    </button>
                  </div>
                } @empty {
                  <div class="p-8 text-center text-slate-400">
                    <mat-icon class="text-3xl mb-1 text-slate-300">notifications_none</mat-icon>
                    <p class="text-xs font-medium">No tienes notificaciones pendientes</p>
                  </div>
                }
              </div>

              <!-- Push Permission prompt footer -->
              @if (notificationService.pushSupported() && !notificationService.hasPushPermission()) {
                <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-t border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                  <span class="text-[11px] text-emerald-800 dark:text-emerald-200">
                    ¿Recibir avisos en tu escritorio/móvil?
                  </span>
                  <button
                    (click)="notificationService.requestPushPermission()"
                    class="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 cursor-pointer"
                  >
                    Permitir
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Quick Theme Toggle -->
        <button
          (click)="themeService.toggleDarkMode()"
          class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          [title]="themeService.isDarkMode() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          aria-label="Alternar tema"
        >
          <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>
      </div>
    </header>
  `,
})
export class Navbar {
  readonly financeService = inject(FinanceService);
  readonly bankSyncService = inject(BankSyncService);
  readonly notificationService = inject(NotificationService);
  readonly themeService = inject(ThemeService);

  readonly openMobileMenu = output<void>();
  readonly openAddTx = output<void>();

  readonly isNotificationsOpen = signal<boolean>(false);

  toggleNotifications(): void {
    this.isNotificationsOpen.update((v) => !v);
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.financeService.searchQuery.set(input.value);
  }

  async triggerSync(): Promise<void> {
    await this.bankSyncService.syncAllAccounts();
  }
}
