import { Component, inject, input, output, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Transaction, TransactionType } from '../../../models/transaction.model';
import { FinanceService } from '../../../services/finance.service';
import { BankSyncService } from '../../../services/bank-sync.service';
import { BcvService } from '../../../services/bcv.service';

@Component({
  selector: 'app-transaction-modal',
  imports: [ReactiveFormsModule, MatIconModule, DecimalPipe],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      (click)="onBackdropClick($event)"
      (keydown.escape)="closeModal.emit()"
      tabindex="0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        tabindex="0"
        role="document"
      >
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center"
              [class.bg-rose-100]="form.controls.type.value === 'expense'"
              [class.text-rose-600]="form.controls.type.value === 'expense'"
              [class.bg-emerald-100]="form.controls.type.value === 'income'"
              [class.text-emerald-600]="form.controls.type.value === 'income'"
            >
              <mat-icon>{{ form.controls.type.value === 'expense' ? 'arrow_downward' : 'arrow_upward' }}</mat-icon>
            </div>
            <div>
              <h2 id="modal-title" class="text-base font-bold text-slate-900 dark:text-white">
                {{ transactionToEdit() ? 'Editar Movimiento' : 'Registrar Nuevo Movimiento' }}
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Operaciones en Bolívares (VES) con conversión y tasa Dólar BCV
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

        <!-- Form Body -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6 overflow-y-auto space-y-4 flex-1">
          <!-- Type Switcher (Gasto / Ingreso) -->
          <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            <button
              type="button"
              (click)="setType('expense')"
              class="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              [class.bg-white]="form.controls.type.value === 'expense'"
              [class.dark:bg-slate-900]="form.controls.type.value === 'expense'"
              [class.text-rose-600]="form.controls.type.value === 'expense'"
              [class.shadow-sm]="form.controls.type.value === 'expense'"
              [class.text-slate-600]="form.controls.type.value !== 'expense'"
              [class.dark:text-slate-400]="form.controls.type.value !== 'expense'"
            >
              <mat-icon class="text-sm">remove_circle_outline</mat-icon>
              <span>Gasto</span>
            </button>

            <button
              type="button"
              (click)="setType('income')"
              class="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              [class.bg-white]="form.controls.type.value === 'income'"
              [class.dark:bg-slate-900]="form.controls.type.value === 'income'"
              [class.text-emerald-600]="form.controls.type.value === 'income'"
              [class.shadow-sm]="form.controls.type.value === 'income'"
              [class.text-slate-600]="form.controls.type.value !== 'income'"
              [class.dark:text-slate-400]="form.controls.type.value !== 'income'"
            >
              <mat-icon class="text-sm">add_circle_outline</mat-icon>
              <span>Ingreso</span>
            </button>
          </div>

          <!-- Currency Input Selector (Ingresar en Bs. o en USD) -->
          <div class="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
            <div class="flex items-center gap-2">
              <mat-icon class="text-emerald-600 text-sm">currency_exchange</mat-icon>
              <span class="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Ingresar monto en:
              </span>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                (click)="toggleInputCurrency('VES')"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                [class.bg-emerald-600]="inputCurrency() === 'VES'"
                [class.text-white]="inputCurrency() === 'VES'"
                [class.text-slate-600]="inputCurrency() !== 'VES'"
                [class.dark:text-slate-300]="inputCurrency() !== 'VES'"
              >
                Bs. (VES)
              </button>
              <button
                type="button"
                (click)="toggleInputCurrency('USD')"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                [class.bg-emerald-600]="inputCurrency() === 'USD'"
                [class.text-white]="inputCurrency() === 'USD'"
                [class.text-slate-600]="inputCurrency() !== 'USD'"
                [class.dark:text-slate-300]="inputCurrency() !== 'USD'"
              >
                $ (USD)
              </button>
            </div>
          </div>

          <!-- Dual Amount Fields with Automatic Calculation -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Amount in VES (Primary) -->
            <div>
              <label for="tx-amount" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Monto en Bolívares (VES) *</span>
                @if (inputCurrency() === 'VES') {
                  <span class="text-[10px] text-emerald-600 font-semibold">Principal</span>
                }
              </label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                  Bs.
                </span>
                <input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  formControlName="amount"
                  (input)="onVesAmountChange($event)"
                  placeholder="0.00"
                  class="w-full pl-11 pr-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-base font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                />
              </div>
              @if (form.controls.amount.touched && form.controls.amount.invalid) {
                <p class="text-xs text-rose-500 mt-1">Ingresa un monto en Bs. mayor a 0.</p>
              }
            </div>

            <!-- Equivalent Amount in USD -->
            <div>
              <label for="tx-amount-usd" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Equivalente en Dólares (USD)</span>
                @if (inputCurrency() === 'USD') {
                  <span class="text-[10px] text-emerald-600 font-semibold">Editando en USD</span>
                }
              </label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                  $
                </span>
                <input
                  id="tx-amount-usd"
                  type="number"
                  step="0.01"
                  min="0.01"
                  formControlName="amountUsd"
                  (input)="onUsdAmountChange($event)"
                  placeholder="0.00"
                  class="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-base font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                />
              </div>
              <p class="text-[10px] text-slate-400 mt-1">Calculado con la tasa de referencia.</p>
            </div>
          </div>

          <!-- Tasa BCV de la Operación -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div class="flex items-center justify-between">
              <label for="tx-rate" class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <mat-icon class="text-emerald-500 text-sm">trending_up</mat-icon>
                <span>Tasa Dólar BCV de la Operación</span>
              </label>
              <button
                type="button"
                (click)="applyCurrentBcvRate()"
                class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                title="Restablecer a la tasa oficial actual del BCV"
              >
                <mat-icon class="text-xs">sync</mat-icon>
                <span>Usar BCV Actual ({{ bcvService.dollarRate() | number:'1.2-4' }})</span>
              </button>
            </div>

            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                  Bs./$
                </span>
                <input
                  id="tx-rate"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  formControlName="exchangeRate"
                  (input)="onRateChange($event)"
                  class="w-full pl-14 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                Oficial: <span class="font-bold text-slate-800 dark:text-slate-200">{{ bcvService.dollarRate() | number:'1.2-2' }}</span>
              </div>
            </div>

            <!-- Live Conversion Badge -->
            @if (form.controls.amount.value && form.controls.amount.value > 0) {
              <div class="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span class="text-slate-500 dark:text-slate-400">Conversión calculada:</span>
                <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Bs. {{ (form.controls.amount.value || 0) | number:'1.2-2' }}
                  ≈
                  $ {{ (form.controls.amountUsd.value || 0) | number:'1.2-2' }} USD
                </span>
              </div>
            }
          </div>

          <!-- Description -->
          <div>
            <label for="tx-desc" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Concepto / Descripción *
            </label>
            <input
              id="tx-desc"
              type="text"
              formControlName="description"
              placeholder="Ej. Compra Automercados Plaza, Pago Nómina, Recarga Gasolina..."
              class="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
            />
            @if (form.controls.description.touched && form.controls.description.invalid) {
              <p class="text-xs text-rose-500 mt-1">Indica una descripción para el movimiento.</p>
            }
          </div>

          <!-- Category Selector -->
          <div>
            <span class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Categoría *
            </span>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700/80 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40">
              @for (cat of filteredCategories(); track cat.id) {
                <button
                  type="button"
                  (click)="form.controls.categoryId.setValue(cat.id)"
                  class="flex items-center gap-2 p-2 rounded-xl text-left text-xs transition-all cursor-pointer border"
                  [class.bg-emerald-50]="form.controls.categoryId.value === cat.id"
                  [class.border-emerald-500]="form.controls.categoryId.value === cat.id"
                  [class.dark:bg-emerald-950/40]="form.controls.categoryId.value === cat.id"
                  [class.border-transparent]="form.controls.categoryId.value !== cat.id"
                  [class.hover:bg-slate-100]="form.controls.categoryId.value !== cat.id"
                  [class.dark:hover:bg-slate-800]="form.controls.categoryId.value !== cat.id"
                >
                  <span
                    class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white text-[10px]"
                    [style.backgroundColor]="cat.color"
                  >
                    <mat-icon class="text-sm">{{ cat.icon }}</mat-icon>
                  </span>
                  <span class="truncate font-medium text-slate-800 dark:text-slate-200">
                    {{ cat.name }}
                  </span>
                </button>
              }
            </div>
          </div>

          <!-- Account & Date row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="tx-account" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Cuenta Bancaria (VES) *
              </label>
              <select
                id="tx-account"
                formControlName="accountId"
                class="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
              >
                @if (bankSyncService.accounts().length === 0) {
                  <option value="acc_general">Cuenta Principal en Bolívares</option>
                }
                @for (acc of bankSyncService.accounts(); track acc.id) {
                  <option [value]="acc.id">
                    {{ acc.bankName }} - {{ acc.name }} ({{ acc.currency }})
                  </option>
                }
              </select>
            </div>

            <div>
              <label for="tx-date" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Fecha de la Operación *
              </label>
              <input
                id="tx-date"
                type="date"
                formControlName="date"
                (change)="onDateChange()"
                class="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <!-- Recurring & Notes -->
          <div class="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isRecurringCheck"
              formControlName="isRecurring"
              class="w-4 h-4 rounded-md text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <label for="isRecurringCheck" class="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              Gasto o Ingreso recurrente mensual (pago automático en Bs.)
            </label>
          </div>

          <div>
            <label for="tx-notes" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Notas adicionales (opcional)
            </label>
            <textarea
              id="tx-notes"
              formControlName="notes"
              rows="2"
              placeholder="Referencia bancaria, número de factura o tasa acordada..."
              class="w-full px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none resize-none"
            ></textarea>
          </div>

          <!-- Action buttons -->
          <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              (click)="closeModal.emit()"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="form.invalid"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {{ transactionToEdit() ? 'Guardar Cambios' : 'Registrar Movimiento' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class TransactionModal implements OnInit {
  private readonly financeService = inject(FinanceService);
  readonly bankSyncService = inject(BankSyncService);
  readonly bcvService = inject(BcvService);

  readonly transactionToEdit = input<Transaction | null>(null);
  readonly closeModal = output<void>();

  readonly inputCurrency = signal<'VES' | 'USD'>('VES');

  readonly form = new FormGroup({
    type: new FormControl<TransactionType>('expense', { nonNullable: true }),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    amountUsd: new FormControl<number | null>(null),
    exchangeRate: new FormControl<number>(52.45, [Validators.required, Validators.min(0.0001)]),
    description: new FormControl<string>('', [Validators.required, Validators.minLength(2)]),
    categoryId: new FormControl<string>('cat_food', { nonNullable: true }),
    accountId: new FormControl<string>('', { nonNullable: true }),
    date: new FormControl<string>(new Date().toISOString().slice(0, 10), { nonNullable: true }),
    isRecurring: new FormControl<boolean>(false, { nonNullable: true }),
    notes: new FormControl<string>(''),
  });

  ngOnInit(): void {
    const existing = this.transactionToEdit();
    const defaultAcc = this.bankSyncService.accounts()[0]?.id || 'acc_general';
    const currentLiveRate = this.bcvService.dollarRate();

    if (existing) {
      const rate = existing.exchangeRate || currentLiveRate;
      const usd = existing.amountUsd ?? Number((existing.amount / rate).toFixed(2));
      this.form.patchValue({
        type: existing.type,
        amount: existing.amount,
        amountUsd: usd,
        exchangeRate: rate,
        description: existing.description,
        categoryId: existing.categoryId,
        accountId: existing.accountId,
        date: existing.date,
        isRecurring: !!existing.isRecurring,
        notes: existing.notes || '',
      });
    } else {
      this.form.patchValue({
        accountId: defaultAcc,
        exchangeRate: currentLiveRate,
      });
    }
  }

  toggleInputCurrency(mode: 'VES' | 'USD'): void {
    this.inputCurrency.set(mode);
  }

  onVesAmountChange(event: Event): void {
    const val = (event.target as HTMLInputElement).valueAsNumber;
    const rate = this.form.controls.exchangeRate.value || this.bcvService.dollarRate();
    if (Number.isFinite(val) && val > 0 && rate > 0) {
      this.form.controls.amountUsd.setValue(Number((val / rate).toFixed(2)), { emitEvent: false });
    } else {
      this.form.controls.amountUsd.setValue(null, { emitEvent: false });
    }
  }

  onUsdAmountChange(event: Event): void {
    const usdVal = (event.target as HTMLInputElement).valueAsNumber;
    const rate = this.form.controls.exchangeRate.value || this.bcvService.dollarRate();
    if (Number.isFinite(usdVal) && usdVal > 0 && rate > 0) {
      const vesAmount = Number((usdVal * rate).toFixed(2));
      this.form.controls.amount.setValue(vesAmount, { emitEvent: false });
    } else {
      this.form.controls.amount.setValue(null, { emitEvent: false });
    }
  }

  onRateChange(event: Event): void {
    const newRate = (event.target as HTMLInputElement).valueAsNumber;
    if (Number.isFinite(newRate) && newRate > 0) {
      if (this.inputCurrency() === 'USD') {
        const usdVal = this.form.controls.amountUsd.value;
        if (usdVal && usdVal > 0) {
          this.form.controls.amount.setValue(Number((usdVal * newRate).toFixed(2)), { emitEvent: false });
        }
      } else {
        const vesVal = this.form.controls.amount.value;
        if (vesVal && vesVal > 0) {
          this.form.controls.amountUsd.setValue(Number((vesVal / newRate).toFixed(2)), { emitEvent: false });
        }
      }
    }
  }

  applyCurrentBcvRate(): void {
    const liveRate = this.bcvService.dollarRate();
    this.form.controls.exchangeRate.setValue(liveRate);
    const vesVal = this.form.controls.amount.value;
    if (vesVal && vesVal > 0) {
      this.form.controls.amountUsd.setValue(Number((vesVal / liveRate).toFixed(2)));
    }
  }

  onDateChange(): void {
    const dateVal = this.form.controls.date.value;
    if (dateVal) {
      const suggestedRate = this.bcvService.getRateForDate(dateVal);
      // If we don't already have a modified rate or if new movement
      if (!this.transactionToEdit()) {
        this.form.controls.exchangeRate.setValue(suggestedRate);
        const vesVal = this.form.controls.amount.value;
        if (vesVal && vesVal > 0) {
          this.form.controls.amountUsd.setValue(Number((vesVal / suggestedRate).toFixed(2)));
        }
      }
    }
  }

  filteredCategories() {
    const t = this.form.controls.type.value;
    return this.financeService.categories().filter((c) => c.type === t);
  }

  setType(type: TransactionType): void {
    this.form.controls.type.setValue(type);
    const available = this.financeService.categories().filter((c) => c.type === type);
    if (available.length > 0) {
      this.form.controls.categoryId.setValue(available[0].id);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const val = this.form.getRawValue();
    const existing = this.transactionToEdit();
    const rate = Number(val.exchangeRate) || this.bcvService.dollarRate();
    const vesAmount = Number(val.amount);
    const usdAmount = Number(val.amountUsd) || Number((vesAmount / (rate || 1)).toFixed(2));

    if (existing) {
      this.financeService.updateTransaction(existing.id, {
        type: val.type,
        amount: vesAmount,
        exchangeRate: rate,
        amountUsd: usdAmount,
        currency: 'VES',
        description: (val.description || '').trim(),
        categoryId: val.categoryId,
        accountId: val.accountId,
        date: val.date,
        isRecurring: val.isRecurring,
        notes: val.notes?.trim() || undefined,
      });
    } else {
      this.financeService.addTransaction({
        type: val.type,
        amount: vesAmount,
        exchangeRate: rate,
        amountUsd: usdAmount,
        currency: 'VES',
        description: (val.description || '').trim(),
        categoryId: val.categoryId,
        accountId: val.accountId,
        date: val.date,
        status: 'cleared',
        isRecurring: val.isRecurring,
        notes: val.notes?.trim() || undefined,
      });
    }

    this.closeModal.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }
}
