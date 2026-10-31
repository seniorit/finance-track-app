import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BankSyncService } from '../../../services/bank-sync.service';
import { FinanceService } from '../../../services/finance.service';
import { BcvService } from '../../../services/bcv.service';
import { CurrencyFormatPipe } from '../../../core/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../../core/pipes/date-format.pipe';
import { DecimalPipe } from '@angular/common';
import { BankAccountType } from '../../../models/bank-account.model';

@Component({
  selector: 'app-bank-sync-modal',
  imports: [ReactiveFormsModule, MatIconModule, CurrencyFormatPipe, DateFormatPipe, DecimalPipe],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
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
            <div class="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div>
              <h2 id="bank-modal-title" class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Gestión de Cuentas Bancarias
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Multidivisa VES / USD
                </span>
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Registra tus bancos, billeteras y efectivo con saldo inicial
              </p>
            </div>
          </div>

          <button
            (click)="closeModal.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Mode Switcher Tabs -->
        <div class="px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
          <button
            type="button"
            (click)="activeTab.set('list')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            [class.bg-blue-50]="activeTab() === 'list'"
            [class.text-blue-700]="activeTab() === 'list'"
            [class.dark:bg-blue-950/60]="activeTab() === 'list'"
            [class.dark:text-blue-300]="activeTab() === 'list'"
            [class.text-slate-500]="activeTab() !== 'list'"
            [class.hover:text-slate-800]="activeTab() !== 'list'"
            [class.dark:hover:text-slate-200]="activeTab() !== 'list'"
          >
            <mat-icon class="text-sm">account_balance_wallet</mat-icon>
            <span>Mis Cuentas ({{ bankSyncService.accounts().length }})</span>
          </button>

          <button
            type="button"
            (click)="activeTab.set('create')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            [class.bg-emerald-50]="activeTab() === 'create'"
            [class.text-emerald-700]="activeTab() === 'create'"
            [class.dark:bg-emerald-950/60]="activeTab() === 'create'"
            [class.dark:text-emerald-300]="activeTab() === 'create'"
            [class.text-slate-500]="activeTab() !== 'create'"
            [class.hover:text-slate-800]="activeTab() !== 'create'"
            [class.dark:hover:text-slate-200]="activeTab() !== 'create'"
          >
            <mat-icon class="text-sm">add_circle</mat-icon>
            <span>+ Registrar Nueva Cuenta</span>
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-6 flex-1">
          <!-- TAB 1: LIST DE CUENTAS -->
          @if (activeTab() === 'list') {
            <!-- Top action bar: Sync All Button & Balance Summary -->
            <div class="p-4 rounded-2xl bg-gradient-to-r from-blue-900/10 via-emerald-900/10 to-teal-900/10 dark:from-blue-950/40 dark:to-teal-950/40 border border-blue-200/60 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <mat-icon class="text-emerald-500 text-sm">security</mat-icon>
                  Saldo Consolidado en Cuentas
                </p>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                    {{ bankSyncService.totalBankBalance() | currencyFormat: 'VES' }}
                  </span>
                  <span class="text-xs font-mono text-slate-400">
                    ≈ $ {{ (bankSyncService.totalBankBalance() / (bcvService.dollarRate() || 52.45)) | number:'1.2-2' }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2 w-full sm:w-auto">
                <button
                  (click)="handleSyncAll()"
                  [disabled]="bankSyncService.isSyncingAll() || bankSyncService.accounts().length === 0"
                  class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <mat-icon [class.animate-spin]="bankSyncService.isSyncingAll()" class="text-sm">sync</mat-icon>
                  <span>{{ bankSyncService.isSyncingAll() ? 'Sincronizando...' : 'Sincronizar' }}</span>
                </button>

                <button
                  (click)="activeTab.set('create')"
                  class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <mat-icon class="text-sm">add</mat-icon>
                  <span>Nueva Cuenta</span>
                </button>
              </div>
            </div>

            <!-- Connected Accounts List -->
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
                        <span
                          class="text-[10px] font-bold px-1.5 py-0.2 rounded uppercase"
                          [class.bg-emerald-100]="acc.currency === 'VES'"
                          [class.text-emerald-700]="acc.currency === 'VES'"
                          [class.dark:bg-emerald-950]="acc.currency === 'VES'"
                          [class.bg-blue-100]="acc.currency === 'USD'"
                          [class.text-blue-700]="acc.currency === 'USD'"
                          [class.dark:bg-blue-950]="acc.currency === 'USD'"
                        >
                          {{ acc.currency || 'VES' }}
                        </span>
                        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {{ acc.accountNumber }}
                        </span>
                      </div>
                      <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>{{ acc.bankName }}</span>
                        <span>•</span>
                        <span class="capitalize">{{ getTypeName(acc.type) }}</span>
                        <span>•</span>
                        <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {{ acc.lastSyncAt | dateFormat: 'relative' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-3 shrink-0">
                    <div class="text-right">
                      <span class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-mono block">
                        @if (acc.currency === 'USD') {
                          $ {{ acc.balance | number:'1.2-2' }}
                        } @else {
                          {{ acc.balance | currencyFormat: 'VES' }}
                        }
                      </span>
                      <span class="text-[10px] font-mono text-slate-400 block">
                        @if (acc.currency === 'USD') {
                          ≈ Bs. {{ (acc.balance * (bcvService.dollarRate() || 52.45)) | number:'1.2-2' }}
                        } @else {
                          ≈ $ {{ bcvService.vesToUsd(acc.balance) | number:'1.2-2' }}
                        }
                      </span>
                    </div>

                    <button
                      (click)="bankSyncService.removeAccount(acc.id)"
                      class="p-1.5 text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar cuenta"
                      aria-label="Eliminar cuenta"
                    >
                      <mat-icon class="text-base">delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 mx-auto flex items-center justify-center">
                    <mat-icon class="text-2xl">account_balance</mat-icon>
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200">No tienes cuentas registradas</h4>
                    <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Agrega tu cuenta bancaria (BDV, Banesco, Mercantil, Pago Móvil o Billetera) con tu saldo actual.
                    </p>
                  </div>
                  <button
                    type="button"
                    (click)="activeTab.set('create')"
                    class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <mat-icon class="text-sm">add</mat-icon>
                    <span>Crear Mi Primera Cuenta</span>
                  </button>
                </div>
              }
            </div>
          }

          <!-- TAB 2: FORMULARIO DE CREACIÓN DE CUENTA -->
          @if (activeTab() === 'create') {
            <div class="space-y-4">
              <div class="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5">
                <mat-icon class="text-blue-600 dark:text-blue-400 text-base shrink-0 mt-0.5">info</mat-icon>
                <div class="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  <p class="font-bold">Nueva Cuenta y Saldo Inicial</p>
                  <p class="text-blue-800/80 dark:text-blue-300 text-[11px]">
                    Si posees fondos en esta cuenta, especifícalos en <strong>Saldo Inicial</strong>. Se creará automáticamente un registro de apertura de balance en tu historial financiero.
                  </p>
                </div>
              </div>

              <form [formGroup]="addAccountForm" (ngSubmit)="onAddAccount()" class="space-y-4">
                <!-- 1. Bank Selector Grid -->
                <div>
                  <span class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    1. Selecciona tu Banco o Entidad Financiera
                  </span>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30">
                    @for (bank of bankSyncService.supportedBanks(); track bank.id) {
                      <button
                        type="button"
                        (click)="selectBank(bank.code)"
                        class="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer"
                        [class.bg-white]="addAccountForm.controls.bankCode.value === bank.code"
                        [class.dark:bg-slate-900]="addAccountForm.controls.bankCode.value === bank.code"
                        [class.border-emerald-500]="addAccountForm.controls.bankCode.value === bank.code"
                        [class.ring-2]="addAccountForm.controls.bankCode.value === bank.code"
                        [class.ring-emerald-500/20]="addAccountForm.controls.bankCode.value === bank.code"
                        [class.border-slate-200]="addAccountForm.controls.bankCode.value !== bank.code"
                        [class.dark:border-slate-700]="addAccountForm.controls.bankCode.value !== bank.code"
                      >
                        <span
                          class="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-2xs"
                          [style.backgroundColor]="bank.color"
                        >
                          {{ bank.badge.slice(0, 3) }}
                        </span>
                        <div class="truncate">
                          <p class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {{ bank.name }}
                          </p>
                        </div>
                      </button>
                    }
                  </div>
                </div>

                <!-- 2. Account Details -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label for="bank-acc-name" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre Personalizado de la Cuenta *
                    </label>
                    <input
                      id="bank-acc-name"
                      type="text"
                      formControlName="name"
                      placeholder="Ej. Cuenta Corriente BDV"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label for="bank-acc-type" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tipo de Producto
                    </label>
                    <select
                      id="bank-acc-type"
                      formControlName="type"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    >
                      <option value="checking">Cuenta Corriente / Débito</option>
                      <option value="savings">Cuenta de Ahorros</option>
                      <option value="wallet">Billetera Virtual / Efectivo</option>
                      <option value="credit">Tarjeta de Crédito</option>
                    </select>
                  </div>
                </div>

                <!-- 3. Currency and Initial Balance -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <div>
                    <span class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Moneda de la Cuenta
                    </span>
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        (click)="addAccountForm.controls.currency.setValue('VES')"
                        class="py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        [class.bg-emerald-600]="addAccountForm.controls.currency.value === 'VES'"
                        [class.text-white]="addAccountForm.controls.currency.value === 'VES'"
                        [class.border-emerald-600]="addAccountForm.controls.currency.value === 'VES'"
                        [class.bg-white]="addAccountForm.controls.currency.value !== 'VES'"
                        [class.text-slate-700]="addAccountForm.controls.currency.value !== 'VES'"
                        [class.dark:bg-slate-800]="addAccountForm.controls.currency.value !== 'VES'"
                        [class.dark:text-slate-200]="addAccountForm.controls.currency.value !== 'VES'"
                        [class.border-slate-200]="addAccountForm.controls.currency.value !== 'VES'"
                        [class.dark:border-slate-700]="addAccountForm.controls.currency.value !== 'VES'"
                      >
                        <span>VES (Bolívares)</span>
                      </button>

                      <button
                        type="button"
                        (click)="addAccountForm.controls.currency.setValue('USD')"
                        class="py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        [class.bg-emerald-600]="addAccountForm.controls.currency.value === 'USD'"
                        [class.text-white]="addAccountForm.controls.currency.value === 'USD'"
                        [class.border-emerald-600]="addAccountForm.controls.currency.value === 'USD'"
                        [class.bg-white]="addAccountForm.controls.currency.value !== 'USD'"
                        [class.text-slate-700]="addAccountForm.controls.currency.value !== 'USD'"
                        [class.dark:bg-slate-800]="addAccountForm.controls.currency.value !== 'USD'"
                        [class.dark:text-slate-200]="addAccountForm.controls.currency.value !== 'USD'"
                        [class.border-slate-200]="addAccountForm.controls.currency.value !== 'USD'"
                        [class.dark:border-slate-700]="addAccountForm.controls.currency.value !== 'USD'"
                      >
                        <span>USD (Dólares)</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label for="bank-acc-balance" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Saldo Inicial ({{ addAccountForm.controls.currency.value === 'USD' ? 'USD $' : 'Bs. VES' }})
                    </label>
                    <div class="relative">
                      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-400 font-mono">
                        {{ addAccountForm.controls.currency.value === 'USD' ? '$' : 'Bs.' }}
                      </span>
                      <input
                        id="bank-acc-balance"
                        type="number"
                        step="0.01"
                        min="0"
                        formControlName="balance"
                        placeholder="0.00"
                        class="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <!-- 4. Optional Masked Account Number -->
                <div>
                  <label for="bank-acc-number" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Número de Cuenta o Referencia (Opcional)
                  </label>
                  <input
                    id="bank-acc-number"
                    type="text"
                    formControlName="accountNumber"
                    placeholder="Ej. •••• 4829 o 0414 1234567"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-mono transition-colors"
                  />
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    (click)="activeTab.set('list')"
                    class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Volver a mis cuentas
                  </button>
                  <button
                    type="submit"
                    [disabled]="addAccountForm.invalid || isSubmitting()"
                    class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <mat-icon class="text-sm">save</mat-icon>
                    <span>{{ isSubmitting() ? 'Guardando...' : 'Crear Cuenta y Asignar Saldo' }}</span>
                  </button>
                </div>
              </form>
            </div>
          }
        </div>

        <!-- Modal Footer -->
        <div class="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
          <span class="text-xs text-slate-400 flex items-center gap-1.5">
            <mat-icon class="text-sm text-emerald-500">lock</mat-icon>
            Cuentas sincronizadas en tiempo real en tu base de datos Firestore
          </span>
          <button
            (click)="closeModal.emit()"
            class="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class BankSyncModal implements OnInit {
  readonly bankSyncService = inject(BankSyncService);
  readonly bcvService = inject(BcvService);
  private readonly financeService = inject(FinanceService);

  readonly initialMode = input<'list' | 'create'>('list');
  readonly closeModal = output<void>();

  readonly activeTab = signal<'list' | 'create'>('list');
  readonly isSubmitting = signal<boolean>(false);

  readonly addAccountForm = new FormGroup({
    bankCode: new FormControl<string>('bdv', { nonNullable: true }),
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    type: new FormControl<BankAccountType>('checking', { nonNullable: true }),
    currency: new FormControl<'VES' | 'USD'>('VES', { nonNullable: true }),
    balance: new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0)] }),
    accountNumber: new FormControl<string>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    if (this.initialMode() === 'create' || this.bankSyncService.accounts().length === 0) {
      this.activeTab.set('create');
    } else {
      this.activeTab.set('list');
    }
  }

  selectBank(code: string): void {
    this.addAccountForm.controls.bankCode.setValue(code);
    const bank = this.bankSyncService.supportedBanks().find((b) => b.code === code);
    if (bank) {
      if (code === 'efectivo_usd' || code === 'wally' || code === 'binance' || code === 'zinli') {
        this.addAccountForm.controls.currency.setValue('USD');
        this.addAccountForm.controls.type.setValue('wallet');
      } else if (code === 'efectivo_ves') {
        this.addAccountForm.controls.currency.setValue('VES');
        this.addAccountForm.controls.type.setValue('wallet');
      } else if (code === 'pagomovil') {
        this.addAccountForm.controls.currency.setValue('VES');
        this.addAccountForm.controls.type.setValue('wallet');
      } else {
        this.addAccountForm.controls.currency.setValue('VES');
        this.addAccountForm.controls.type.setValue('checking');
      }

      if (!this.addAccountForm.controls.name.value) {
        this.addAccountForm.controls.name.setValue(`Cuenta ${bank.name}`);
      }
    }
  }

  getTypeName(type: BankAccountType): string {
    switch (type) {
      case 'checking':
        return 'Corriente';
      case 'savings':
        return 'Ahorros';
      case 'wallet':
        return 'Billetera / Efectivo';
      case 'credit':
        return 'Crédito';
      default:
        return type;
    }
  }

  async handleSyncAll(): Promise<void> {
    await this.bankSyncService.syncAllAccounts();
  }

  async onAddAccount(): Promise<void> {
    if (this.addAccountForm.invalid) return;

    this.isSubmitting.set(true);
    try {
      const v = this.addAccountForm.getRawValue();
      const initialBalance = Number(v.balance) || 0;

      this.bankSyncService.addBankAccount(
        v.bankCode,
        (v.name || '').trim(),
        initialBalance,
        v.type,
        v.currency,
        (v.accountNumber || '').trim() || undefined,
        true // Create opening balance transaction if > 0
      );

      // Reset form
      this.addAccountForm.reset({
        bankCode: 'bdv',
        name: '',
        type: 'checking',
        currency: 'VES',
        balance: 0,
        accountNumber: '',
      });

      this.activeTab.set('list');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }
}
