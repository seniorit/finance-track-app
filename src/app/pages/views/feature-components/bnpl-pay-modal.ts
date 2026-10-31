import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { BnplService } from '../../../services/bnpl.service';
import { BankSyncService } from '../../../services/bank-sync.service';
import { BcvService } from '../../../services/bcv.service';
import { BnplInstallment } from '../../../models/bnpl.model';

export interface PayModalTarget {
  purchaseId: string;
  installment: BnplInstallment;
  totalInstallments: number;
  itemDescription: string;
  storeName: string;
  providerName: string;
}

@Component({
  selector: 'app-bnpl-pay-modal',
  imports: [ReactiveFormsModule, MatIconModule, DecimalPipe],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      (click)="onBackdropClick($event)"
      (keydown.escape)="closeModal.emit()"
      tabindex="0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-modal-title"
    >
      <div
        class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        tabindex="0"
        role="document"
      >
        <!-- Modal Header -->
        <div class="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <mat-icon class="text-xl">check_circle</mat-icon>
            </div>
            <div>
              <h2 id="pay-modal-title" class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Pagar Cuota #{{ target().installment.number }} de {{ target().totalInstallments }}
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ target().providerName }} · {{ target().storeName }}
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

        <!-- Body -->
        <div class="p-5 sm:p-6 space-y-5">
          <!-- Installment summary card -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <p class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ target().itemDescription }}</p>
            <div class="flex items-baseline justify-between">
              <span class="text-xs text-slate-400 font-mono">Monto a cancelar:</span>
              <div class="text-right">
                <span class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  $ {{ target().installment.amountUsd | number:'1.2-2' }} USD
                </span>
                <p class="text-xs font-mono text-slate-500 dark:text-slate-400">
                  ≈ Bs. {{ (target().installment.amountUsd * (bcvService.dollarRate() || 52.45)) | number:'1.2-2' }} (Tasa BCV)
                </p>
              </div>
            </div>
            <div class="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
              <span>Fecha estipulada de vencimiento:</span>
              <span class="font-mono font-bold text-slate-700 dark:text-slate-300">{{ target().installment.dueDate }}</span>
            </div>
          </div>

          <!-- Payment Options Form -->
          <form [formGroup]="payForm" class="space-y-4">
            <div>
              <label for="bnpl-pay-date" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fecha del Pago
              </label>
              <input
                id="bnpl-pay-date"
                type="date"
                formControlName="paymentDate"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <!-- Optional Bank account debit -->
            <div class="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-slate-900 dark:text-white block">
                    Debitar de cuenta bancaria
                  </span>
                  <span class="text-[11px] text-slate-500 dark:text-slate-400">
                    Registrar egreso contable y descontar saldo automáticamente
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="bnpl-debit-account"
                  formControlName="debitFromAccount"
                  class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
              </div>

              @if (payForm.controls.debitFromAccount.value) {
                <div class="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/50">
                  <label for="bnpl-account-select" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Seleccionar Cuenta o Billetera
                  </label>
                  @if (bankSyncService.accounts().length > 0) {
                    <select
                      id="bnpl-account-select"
                      formControlName="accountId"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    >
                      @for (acc of bankSyncService.accounts(); track acc.id) {
                        <option [value]="acc.id">
                          {{ acc.bankName }} ({{ acc.name }}) — Saldo: {{ acc.currency === 'USD' ? '$' + (acc.balance | number:'1.2-2') : 'Bs. ' + (acc.balance | number:'1.2-2') }}
                        </option>
                      }
                    </select>
                  } @else {
                    <p class="text-xs text-amber-600 dark:text-amber-400">
                      No tienes cuentas bancarias registradas. Puedes marcar la cuota como pagada sin vincular una cuenta.
                    </p>
                  }
                </div>
              }
            </div>
          </form>
        </div>

        <!-- Footer Actions -->
        <div class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <button
            type="button"
            (click)="closeModal.emit()"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            (click)="onConfirmPay()"
            [disabled]="isSubmitting()"
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <mat-icon class="text-sm">check</mat-icon>
            <span>{{ isSubmitting() ? 'Procesando...' : 'Confirmar Pago de Cuota' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class BnplPayModal {
  readonly bnplService = inject(BnplService);
  readonly bankSyncService = inject(BankSyncService);
  readonly bcvService = inject(BcvService);

  readonly target = input.required<PayModalTarget>();
  readonly closeModal = output<void>();

  readonly isSubmitting = signal<boolean>(false);

  readonly payForm = new FormGroup({
    paymentDate: new FormControl<string>(new Date().toISOString().slice(0, 10), { nonNullable: true }),
    debitFromAccount: new FormControl<boolean>(true, { nonNullable: true }),
    accountId: new FormControl<string>('', { nonNullable: true }),
  });

  constructor() {
    // Select first account by default if available
    const firstAcc = this.bankSyncService.accounts()[0];
    if (firstAcc) {
      this.payForm.controls.accountId.setValue(firstAcc.id);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }

  async onConfirmPay(): Promise<void> {
    this.isSubmitting.set(true);
    try {
      const v = this.payForm.getRawValue();
      const accountId = v.debitFromAccount && v.accountId ? v.accountId : undefined;

      await this.bnplService.markInstallmentPaid(
        this.target().purchaseId,
        this.target().installment.number,
        {
          accountId,
          paidDate: v.paymentDate,
        }
      );

      this.closeModal.emit();
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
