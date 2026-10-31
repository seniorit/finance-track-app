import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BnplProviderId, CASHEA_DOWN_PAYMENT_PRESETS } from '../../../models/bnpl.model';
import { BcvService } from '../../../services/bcv.service';
import { BnplService } from '../../../services/bnpl.service';

@Component({
  selector: 'app-bnpl-purchase-modal',
  imports: [ReactiveFormsModule, MatIconModule, DecimalPipe],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      (click)="onBackdropClick($event)"
      (keydown.escape)="closeModal.emit()"
      tabindex="0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bnpl-modal-title"
    >
      <div
        class="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        tabindex="0"
        role="document"
      >
        <!-- Modal Header -->
        <div
          class="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/70"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"
            >
              <mat-icon class="text-xl">credit_score</mat-icon>
            </div>
            <div>
              <h2
                id="bnpl-modal-title"
                class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight"
              >
                Registrar Compra Financiada
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Cashea, Krece, creditotal y financiamientos en cuotas quincenales
              </p>
            </div>
          </div>
          <button
            type="button"
            (click)="closeModal.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <mat-icon class="text-lg">close</mat-icon>
          </button>
        </div>

        <!-- Scrollable Form Body -->
        <form
          [formGroup]="purchaseForm"
          (ngSubmit)="onSubmit()"
          class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5"
        >
          <!-- 1. Provider Picker -->
          <div>
            <span class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              1. Plataforma de Financiamiento (BNPL)
            </span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              @for (provider of bnplService.providers(); track provider.id) {
                <button
                  type="button"
                  (click)="setProvider(provider.id)"
                  class="p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer relative"
                  [class.ring-2]="selectedProviderId() === provider.id"
                  [class.ring-amber-500]="selectedProviderId() === provider.id"
                  [class.bg-amber-50/40]="
                    selectedProviderId() === provider.id && provider.id === 'cashea'
                  "
                  [class.bg-purple-50/40]="
                    selectedProviderId() === provider.id && provider.id === 'krece'
                  "
                  [class.bg-cyan-50/40]="
                    selectedProviderId() === provider.id && provider.id === 'creditotal'
                  "
                  [class.bg-emerald-50/40]="
                    selectedProviderId() === provider.id && provider.id === 'custom'
                  "
                  [class.dark:bg-slate-800/80]="selectedProviderId() === provider.id"
                  [class.border-slate-200]="selectedProviderId() !== provider.id"
                  [class.dark:border-slate-700]="selectedProviderId() !== provider.id"
                >
                  <div class="flex items-center justify-between">
                    <span
                      class="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                      [style.backgroundColor]="provider.color"
                    >
                      <mat-icon class="text-sm">{{ provider.icon }}</mat-icon>
                    </span>
                    @if (selectedProviderId() === provider.id) {
                      <mat-icon class="text-sm text-amber-600 dark:text-amber-400"
                        >check_circle</mat-icon
                      >
                    }
                  </div>
                  <div>
                    <p class="text-xs font-bold text-slate-900 dark:text-white">
                      {{ provider.name }}
                    </p>
                    <p class="text-[10px] text-slate-400 line-clamp-1">{{ provider.tagline }}</p>
                  </div>
                </button>
              }
            </div>
          </div>

          <!-- 2. Store & Item Information -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                for="bnpl-store"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Comercio / Tienda Afiliada
              </label>
              <input
                id="bnpl-store"
                type="text"
                formControlName="storeName"
                placeholder="Ej. Traki, Farmatodo, Daka, Mango Bajito"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              @if (
                purchaseForm.controls.storeName.touched && purchaseForm.controls.storeName.invalid
              ) {
                <p class="text-[11px] text-rose-500 mt-1">Ingresa el nombre del comercio.</p>
              }
            </div>

            <div>
              <label
                for="bnpl-item"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Artículo o Concepto
              </label>
              <input
                id="bnpl-item"
                type="text"
                formControlName="itemDescription"
                placeholder="Ej. Teléfono Samsung Galaxy, Calzado deportivo"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              @if (
                purchaseForm.controls.itemDescription.touched &&
                purchaseForm.controls.itemDescription.invalid
              ) {
                <p class="text-[11px] text-rose-500 mt-1">Indica qué compraste.</p>
              }
            </div>
          </div>

          <!-- 3. Total Amount in USD & Purchase Date -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                for="bnpl-total"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Monto Total de la Compra ($ USD)
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">$</span>
                <input
                  id="bnpl-total"
                  type="number"
                  step="0.01"
                  min="1"
                  formControlName="totalAmountUsd"
                  (input)="onTotalAmountInput($event)"
                  placeholder="120.00"
                  class="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm font-bold font-mono text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <p class="text-[10px] text-slate-400 font-mono mt-1">
                ≈ Bs.
                {{ (totalAmountUsd() || 0) * (bcvService.dollarRate() || 52.45) | number: '1.2-2' }}
                al BCV
              </p>
            </div>

            <div>
              <label
                for="bnpl-pdate"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Fecha de Compra
              </label>
              <input
                id="bnpl-pdate"
                type="date"
                formControlName="purchaseDate"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <!-- 4. Down Payment (Inicial) according to Level or Custom -->
          <div
            class="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/50 space-y-3"
          >
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
              >
                <mat-icon class="text-amber-600 dark:text-amber-400 text-sm">payments</mat-icon>
                Pago Inicial (Nivel Cashea / Porcentaje)
              </span>
              <span class="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                $ {{ computedDownPaymentUsd() | number: '1.2-2' }} ({{ downPaymentPercent() }}%)
              </span>
            </div>

            <!-- Level buttons -->
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              @for (preset of casheaPresets; track preset.percent) {
                <button
                  type="button"
                  (click)="setDownPaymentPercent(preset.percent)"
                  class="py-2 px-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer"
                  [class.bg-amber-600]="downPaymentPercent() === preset.percent"
                  [class.text-white]="downPaymentPercent() === preset.percent"
                  [class.border-amber-600]="downPaymentPercent() === preset.percent"
                  [class.bg-white]="downPaymentPercent() !== preset.percent"
                  [class.text-slate-700]="downPaymentPercent() !== preset.percent"
                  [class.dark:bg-slate-800]="downPaymentPercent() !== preset.percent"
                  [class.dark:text-slate-300]="downPaymentPercent() !== preset.percent"
                  [class.border-slate-200]="downPaymentPercent() !== preset.percent"
                  [class.dark:border-slate-700]="downPaymentPercent() !== preset.percent"
                  [title]="preset.description"
                >
                  {{ preset.percent }}% Inicial
                </button>
              }
            </div>

            <!-- Custom Percentage Input Row -->
            <div
              class="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-amber-200/40 dark:border-amber-900/40 text-xs"
            >
              <div class="flex items-center gap-2">
                <span class="text-slate-600 dark:text-slate-400 text-[11px] font-medium"
                  >O porcentaje personalizado:</span
                >
                <div class="relative w-20">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    [value]="downPaymentPercent()"
                    (input)="onCustomPercentInput($event)"
                    class="w-full pl-2.5 pr-6 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span class="absolute right-2 top-1 text-[11px] font-bold text-slate-400">%</span>
                </div>
              </div>

              <div class="text-right">
                <span class="text-[11px] text-slate-500 dark:text-slate-400">Total Inicial: </span>
                <span class="text-xs font-mono font-black text-amber-700 dark:text-amber-300">
                  $ {{ computedDownPaymentUsd() | number: '1.2-2' }} USD
                </span>
                <span class="text-[10px] text-slate-400 font-mono block">
                  ≈ Bs.
                  {{
                    computedDownPaymentUsd() * (bcvService.dollarRate() || 52.45) | number: '1.2-2'
                  }}
                </span>
              </div>
            </div>

            <div
              class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-amber-200/40 dark:border-amber-900/40"
            >
              <span class="font-medium">Monto Financiado en Cuotas:</span>
              <span class="font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                $ {{ computedFinancedUsd() | number: '1.2-2' }} USD
              </span>
            </div>
          </div>

          <!-- 5. Number of Installments & First Due Date -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <span class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Número de Cuotas
              </span>
              <div class="grid grid-cols-4 gap-2">
                @for (cnt of [3, 6, 9, 12]; track cnt) {
                  <button
                    type="button"
                    (click)="setInstallmentsCount(cnt)"
                    class="py-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer"
                    [class.bg-amber-600]="installmentsCount() === cnt"
                    [class.text-white]="installmentsCount() === cnt"
                    [class.border-amber-600]="installmentsCount() === cnt"
                    [class.bg-slate-50]="installmentsCount() !== cnt"
                    [class.text-slate-700]="installmentsCount() !== cnt"
                    [class.dark:bg-slate-800]="installmentsCount() !== cnt"
                    [class.dark:text-slate-300]="installmentsCount() !== cnt"
                    [class.border-slate-200]="installmentsCount() !== cnt"
                    [class.dark:border-slate-700]="installmentsCount() !== cnt"
                  >
                    {{ cnt }} cuotas
                  </button>
                }
              </div>
            </div>

            <div>
              <label
                for="bnpl-first-date"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Vencimiento de la 1ª Cuota (Quincenal)
              </label>
              <input
                id="bnpl-first-date"
                type="date"
                formControlName="firstDueDate"
                (input)="onFirstDueDateInput($event)"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <!-- 6. Deuda en curso (In-progress debt toggle) -->
          <div
            class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  ¿Es una deuda ya en curso?
                </span>
                <span class="text-[11px] text-slate-400">
                  Activa esta opción si ya compraste el producto y has cancelado cuotas previas.
                </span>
              </div>
              <input
                type="checkbox"
                id="bnpl-is-existing"
                [checked]="isExistingDebt()"
                (change)="onToggleExistingDebt($event)"
                class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
              />
            </div>

            @if (isExistingDebt()) {
              <div
                class="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4"
              >
                <label
                  for="bnpl-prepaid-count"
                  class="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  ¿Cuántas cuotas has pagado ya?
                </label>
                <div class="w-32">
                  <select
                    id="bnpl-prepaid-count"
                    (change)="onPrepaidCountChange($event)"
                    class="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    @for (idx of availablePrepaidNumbers(); track idx) {
                      <option [value]="idx" [selected]="prepaidInstallmentsCount() === idx">
                        {{ idx }} de {{ installmentsCount() }} pagadas
                      </option>
                    }
                  </select>
                </div>
              </div>
            }
          </div>

          <!-- 7. Live Installments Schedule Preview -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-700 dark:text-slate-300">
                Cronograma Quincenal Proyectado
              </span>
              <span class="text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold">
                {{ installmentsCount() }} cuotas quincenales (cada 14 días)
              </span>
            </div>

            <div
              class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800"
            >
              @for (item of computedInstallmentsPreview(); track item.number) {
                <div
                  class="p-2.5 sm:px-4 flex items-center justify-between text-xs transition-colors"
                  [class.bg-emerald-50/50]="item.isPrepaid"
                  [class.dark:bg-emerald-950/20]="item.isPrepaid"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px]"
                      [class.bg-emerald-100]="item.isPrepaid"
                      [class.text-emerald-700]="item.isPrepaid"
                      [class.dark:bg-emerald-900/60]="item.isPrepaid"
                      [class.dark:text-emerald-300]="item.isPrepaid"
                      [class.bg-slate-100]="!item.isPrepaid"
                      [class.text-slate-600]="!item.isPrepaid"
                      [class.dark:bg-slate-800]="!item.isPrepaid"
                      [class.dark:text-slate-300]="!item.isPrepaid"
                    >
                      #{{ item.number }}
                    </span>
                    <span class="font-mono text-slate-600 dark:text-slate-300">{{
                      item.dueDate
                    }}</span>
                    @if (item.isPrepaid) {
                      <span
                        class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-1 flex items-center gap-0.5"
                      >
                        <mat-icon class="text-xs">check</mat-icon>
                        Abonada
                      </span>
                    }
                  </div>
                  <div class="text-right font-mono">
                    <span class="font-bold text-slate-900 dark:text-white"
                      >$ {{ item.amountUsd | number: '1.2-2' }}</span
                    >
                    <span class="text-[10px] text-slate-400 ml-1.5">
                      ≈ Bs.
                      {{ item.amountUsd * (bcvService.dollarRate() || 52.45) | number: '1.2-2' }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </div>
        </form>

        <!-- Modal Footer Actions -->
        <div
          class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/70 dark:bg-slate-900/70 shrink-0"
        >
          <button
            type="button"
            (click)="closeModal.emit()"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            (click)="onSubmit()"
            [disabled]="purchaseForm.invalid || isSubmitting()"
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <mat-icon class="text-sm">save</mat-icon>
            <span>{{ isSubmitting() ? 'Guardando...' : 'Guardar Compra Financiada' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class BnplPurchaseModal {
  readonly bnplService = inject(BnplService);
  readonly bcvService = inject(BcvService);
  readonly closeModal = output<void>();

  readonly casheaPresets = CASHEA_DOWN_PAYMENT_PRESETS;
  readonly isSubmitting = signal<boolean>(false);
  readonly selectedProviderId = signal<BnplProviderId>('cashea');

  // Initial default dates (first due date 14 days from today)
  private readonly defaultPurchaseDate = new Date().toISOString().slice(0, 10);
  private readonly defaultFirstDueDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  })();

  // Reactive signals for real-time calculations
  readonly totalAmountUsd = signal<number>(100);
  readonly downPaymentPercent = signal<number>(60);
  readonly installmentsCount = signal<number>(3);
  readonly firstDueDate = signal<string>(this.defaultFirstDueDate);
  readonly isExistingDebt = signal<boolean>(false);
  readonly prepaidInstallmentsCount = signal<number>(0);

  readonly purchaseForm = new FormGroup({
    providerId: new FormControl<BnplProviderId>('cashea', { nonNullable: true }),
    storeName: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    itemDescription: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    purchaseDate: new FormControl<string>(this.defaultPurchaseDate, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    totalAmountUsd: new FormControl<number>(100, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    downPaymentPercent: new FormControl<number>(60, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(100)],
    }),
    installmentsCount: new FormControl<number>(3, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    firstDueDate: new FormControl<string>(this.defaultFirstDueDate, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    isExistingDebt: new FormControl<boolean>(false, { nonNullable: true }),
    prepaidInstallmentsCount: new FormControl<number>(0, { nonNullable: true }),
  });

  constructor() {
    // Keep signals in sync if form is touched via programmatic patch or external events
    this.purchaseForm.valueChanges.subscribe((vals) => {
      if (vals.totalAmountUsd !== undefined && vals.totalAmountUsd !== this.totalAmountUsd()) {
        this.totalAmountUsd.set(vals.totalAmountUsd || 0);
      }
      if (
        vals.downPaymentPercent !== undefined &&
        vals.downPaymentPercent !== this.downPaymentPercent()
      ) {
        this.downPaymentPercent.set(vals.downPaymentPercent || 0);
      }
      if (
        vals.installmentsCount !== undefined &&
        vals.installmentsCount !== this.installmentsCount()
      ) {
        this.installmentsCount.set(vals.installmentsCount || 3);
      }
      if (vals.firstDueDate && vals.firstDueDate !== this.firstDueDate()) {
        this.firstDueDate.set(vals.firstDueDate);
      }
      if (vals.isExistingDebt !== undefined && vals.isExistingDebt !== this.isExistingDebt()) {
        this.isExistingDebt.set(Boolean(vals.isExistingDebt));
      }
      if (
        vals.prepaidInstallmentsCount !== undefined &&
        vals.prepaidInstallmentsCount !== this.prepaidInstallmentsCount()
      ) {
        this.prepaidInstallmentsCount.set(vals.prepaidInstallmentsCount || 0);
      }
    });
  }

  // Reactive down payment calculation in USD
  readonly computedDownPaymentUsd = computed(() => {
    const total = this.totalAmountUsd() || 0;
    const pct = this.downPaymentPercent() || 0;
    return Number(((total * pct) / 100).toFixed(2));
  });

  // Reactive remaining financed amount in USD
  readonly computedFinancedUsd = computed(() => {
    const total = this.totalAmountUsd() || 0;
    const down = this.computedDownPaymentUsd();
    return Number(Math.max(0, total - down).toFixed(2));
  });

  // Numbers available for prepaid installments selection
  readonly availablePrepaidNumbers = computed(() => {
    const count = this.installmentsCount() || 3;
    const list: number[] = [];
    for (let i = 0; i <= count; i++) {
      list.push(i);
    }
    return list;
  });

  // Reactive live projected schedule
  readonly computedInstallmentsPreview = computed(() => {
    const financed = this.computedFinancedUsd();
    const count = this.installmentsCount() || 3;
    const startDate = this.firstDueDate() || this.defaultFirstDueDate;
    const isExisting = this.isExistingDebt();
    const prepaid = isExisting ? this.prepaidInstallmentsCount() || 0 : 0;

    const installmentAmount = count > 0 ? Number((financed / count).toFixed(2)) : 0;
    const dates = this.bnplService.calculateInstallmentDates(startDate, count, 14);

    return dates.map((dueDate, idx) => ({
      number: idx + 1,
      dueDate,
      amountUsd: installmentAmount,
      isPrepaid: idx < prepaid,
    }));
  });

  setProvider(id: BnplProviderId): void {
    this.selectedProviderId.set(id);
    this.purchaseForm.controls.providerId.setValue(id);
    let initialPct = 60;
    if (id === 'krece') initialPct = 40;
    else if (id === 'creditotal') initialPct = 50;
    else if (id === 'custom') initialPct = 0;

    this.setDownPaymentPercent(initialPct);
    this.setInstallmentsCount(3);
  }

  setDownPaymentPercent(pct: number): void {
    const safePct = Math.min(100, Math.max(0, pct));
    this.downPaymentPercent.set(safePct);
    this.purchaseForm.controls.downPaymentPercent.setValue(safePct);
  }

  setInstallmentsCount(count: number): void {
    const safeCount = Math.max(1, count);
    this.installmentsCount.set(safeCount);
    this.purchaseForm.controls.installmentsCount.setValue(safeCount);
    if (this.prepaidInstallmentsCount() > safeCount) {
      this.prepaidInstallmentsCount.set(safeCount);
      this.purchaseForm.controls.prepaidInstallmentsCount.setValue(safeCount);
    }
  }

  onTotalAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    const safeVal = isNaN(val) ? 0 : Math.max(0, val);
    this.totalAmountUsd.set(safeVal);
    this.purchaseForm.controls.totalAmountUsd.setValue(safeVal);
  }

  onCustomPercentInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    const safeVal = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));
    this.setDownPaymentPercent(safeVal);
  }

  onFirstDueDateInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (val) {
      this.firstDueDate.set(val);
      this.purchaseForm.controls.firstDueDate.setValue(val);
    }
  }

  onToggleExistingDebt(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.isExistingDebt.set(checked);
    this.purchaseForm.controls.isExistingDebt.setValue(checked);
    if (!checked) {
      this.prepaidInstallmentsCount.set(0);
      this.purchaseForm.controls.prepaidInstallmentsCount.setValue(0);
    }
  }

  onPrepaidCountChange(event: Event): void {
    const count = Number((event.target as HTMLSelectElement).value) || 0;
    this.prepaidInstallmentsCount.set(count);
    this.purchaseForm.controls.prepaidInstallmentsCount.setValue(count);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }

  onSubmit(): void {
    if (this.purchaseForm.invalid) return;

    this.isSubmitting.set(true);
    try {
      const v = this.purchaseForm.getRawValue();
      const prepaid = this.isExistingDebt() ? this.prepaidInstallmentsCount() : 0;

      this.bnplService.addPurchase({
        providerId: v.providerId,
        storeName: v.storeName,
        itemDescription: v.itemDescription,
        purchaseDate: v.purchaseDate,
        totalAmountUsd: this.totalAmountUsd(),
        downPaymentPercent: this.downPaymentPercent(),
        installmentsCount: this.installmentsCount(),
        frequencyDays: 14,
        firstDueDate: this.firstDueDate(),
        prepaidInstallmentsCount: prepaid,
      });

      this.closeModal.emit();
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
