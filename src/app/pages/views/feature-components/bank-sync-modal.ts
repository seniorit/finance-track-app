import { Component, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BankSyncService } from '../../../services/bank-sync.service';
import { FinanceService } from '../../../services/finance.service';
import { CurrencyFormatPipe } from '../../../core/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../../core/pipes/date-format.pipe';

@Component({
  selector: 'app-bank-sync-modal',
  imports: [ReactiveFormsModule, MatIconModule, CurrencyFormatPipe, DateFormatPipe],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      (click)="onBackdropClick($event)"
      (keydown.escape)="closeModal.emit()"
      tabindex="0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bank-modal-title"
    >
      <div
        class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        tabindex="0"
        role="document"
      >
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div>
              <h2 id="bank-modal-title" class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Sincronización Bancaria
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  PSD2 Open Banking
                </span>
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Conecta tus bancos y sincroniza transacciones y saldos en tiempo real
              </p>
            </div>
          </div>

          <button
            (click)="closeModal.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-6 flex-1">
          <!-- Top action bar: Sync All Button -->
          <div class="p-4 rounded-2xl bg-gradient-to-r from-blue-900/10 via-emerald-900/10 to-teal-900/10 dark:from-blue-950/40 dark:to-teal-950/40 border border-blue-200/60 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <mat-icon class="text-emerald-500 text-sm">security</mat-icon>
                Conexión bancaria segura cifrada
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {{ bankSyncService.connectedCount() }} cuentas vinculadas • Saldo total:
                <span class="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {{ bankSyncService.totalBankBalance() | currencyFormat: 'EUR' }}
                </span>
              </p>
            </div>

            <button
              (click)="handleSyncAll()"
              [disabled]="bankSyncService.isSyncingAll()"
              class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <mat-icon [class.animate-spin]="bankSyncService.isSyncingAll()" class="text-sm">
                sync
              </mat-icon>
              <span>{{ bankSyncService.isSyncingAll() ? 'Sincronizando bancos...' : 'Sincronizar Todas Ahora' }}</span>
            </button>
          </div>

          <!-- Connected Accounts List -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">
                Cuentas y Tarjetas Activas
              </h3>
              <button
                (click)="showAddForm.set(!showAddForm())"
                class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <mat-icon class="text-sm">{{ showAddForm() ? 'remove' : 'add' }}</mat-icon>
                <span>{{ showAddForm() ? 'Ocultar formulario' : 'Vincular nueva cuenta' }}</span>
              </button>
            </div>

            <div class="space-y-2.5">
              @for (acc of bankSyncService.accounts(); track acc.id) {
                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                  <div class="flex items-center gap-3 min-w-0">
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-xs"
                      [style.backgroundColor]="acc.color"
                    >
                      <mat-icon class="text-lg">
                        {{ acc.type === 'credit' ? 'credit_card' : acc.type === 'wallet' ? 'wallet' : 'account_balance' }}
                      </mat-icon>
                    </div>

                    <div class="truncate">
                      <div class="flex items-center gap-2">
                        <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {{ acc.name }}
                        </span>
                        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {{ acc.accountNumber }}
                        </span>
                      </div>
                      <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>{{ acc.bankName }}</span>
                        <span>•</span>
                        <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {{ acc.lastSyncAt | dateFormat: 'relative' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-3 shrink-0">
                    <span class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-mono">
                      {{ acc.balance | currencyFormat: 'EUR' }}
                    </span>

                    <button
                      (click)="bankSyncService.removeAccount(acc.id)"
                      class="p-1.5 text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Desvincular cuenta"
                      aria-label="Desvincular cuenta"
                    >
                      <mat-icon class="text-base">delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Add Account Form Toggle -->
          @if (showAddForm()) {
            <div class="p-5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                <mat-icon class="text-sm text-emerald-500">add_link</mat-icon>
                Conectar con una Entidad Financiera
              </h4>

              <form [formGroup]="addAccountForm" (ngSubmit)="onAddAccount()" class="space-y-3.5">
                <!-- Bank Selector Grid -->
                <div>
                  <span class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Selecciona tu Banco o Billetera
                  </span>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    @for (bank of bankSyncService.supportedBanks(); track bank.id) {
                      <button
                        type="button"
                        (click)="addAccountForm.controls.bankCode.setValue(bank.code)"
                        class="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer"
                        [class.bg-white]="addAccountForm.controls.bankCode.value === bank.code"
                        [class.dark:bg-slate-900]="addAccountForm.controls.bankCode.value === bank.code"
                        [class.border-emerald-500]="addAccountForm.controls.bankCode.value === bank.code"
                        [class.shadow-xs]="addAccountForm.controls.bankCode.value === bank.code"
                        [class.border-slate-200]="addAccountForm.controls.bankCode.value !== bank.code"
                        [class.dark:border-slate-700]="addAccountForm.controls.bankCode.value !== bank.code"
                      >
                        <span
                          class="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          [style.backgroundColor]="bank.color"
                        >
                          {{ bank.badge.slice(0, 3) }}
                        </span>
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {{ bank.name }}
                        </span>
                      </button>
                    }
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label for="bank-acc-name" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Nombre Personalizado
                    </label>
                    <input
                      id="bank-acc-name"
                      type="text"
                      formControlName="name"
                      placeholder="Ej. Cuenta Nómina Principal"
                      class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label for="bank-acc-type" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Tipo de Producto
                    </label>
                    <select
                      id="bank-acc-type"
                      formControlName="type"
                      class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    >
                      <option value="checking">Cuenta Corriente / Débito</option>
                      <option value="savings">Cuenta de Ahorros</option>
                      <option value="credit">Tarjeta de Crédito</option>
                      <option value="wallet">Billetera Virtual / Efectivo</option>
                    </select>
                  </div>

                  <div>
                    <label for="bank-acc-balance" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Saldo Inicial (€)
                    </label>
                    <input
                      id="bank-acc-balance"
                      type="number"
                      step="0.01"
                      formControlName="balance"
                      placeholder="1500.00"
                      class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    (click)="showAddForm.set(false)"
                    class="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    [disabled]="addAccountForm.invalid"
                    class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    Confirmar Vinculación
                  </button>
                </div>
              </form>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
          <span class="text-xs text-slate-400 flex items-center gap-1.5">
            <mat-icon class="text-sm text-emerald-500">lock</mat-icon>
            Credenciales protegidas bajo norma europea PSD2
          </span>
          <button
            (click)="closeModal.emit()"
            class="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  `,
})
export class BankSyncModal {
  readonly bankSyncService = inject(BankSyncService);
  private readonly financeService = inject(FinanceService);

  readonly closeModal = output<void>();
  readonly showAddForm = signal<boolean>(false);

  readonly addAccountForm = new FormGroup({
    bankCode: new FormControl<string>('bbva', { nonNullable: true }),
    name: new FormControl<string>('', [Validators.required, Validators.minLength(2)]),
    type: new FormControl<'checking' | 'savings' | 'credit' | 'wallet'>('checking', { nonNullable: true }),
    balance: new FormControl<number>(1200, [Validators.required]),
  });

  async handleSyncAll(): Promise<void> {
    const res = await this.bankSyncService.syncAllAccounts();
    // Simulate finding a new transaction
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

  onAddAccount(): void {
    if (this.addAccountForm.invalid) return;
    const v = this.addAccountForm.getRawValue();
    this.bankSyncService.addBankAccount(v.bankCode, v.name || 'Cuenta Bancaria', Number(v.balance) || 0, v.type);
    this.addAccountForm.reset({
      bankCode: 'bbva',
      name: '',
      type: 'checking',
      balance: 1200,
    });
    this.showAddForm.set(false);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }
}
