import { Component, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BudgetService } from '../../../services/budget.service';
import { FinanceService } from '../../../services/finance.service';
import { CurrencyFormatPipe } from '../../../core/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../../core/pipes/date-format.pipe';

@Component({
  selector: 'app-budget-manager-modal',
  imports: [ReactiveFormsModule, MatIconModule, CurrencyFormatPipe, DateFormatPipe],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      (click)="onBackdropClick($event)"
      (keydown.escape)="closeModal.emit()"
      tabindex="0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-modal-title"
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
            <div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <mat-icon>donut_large</mat-icon>
            </div>
            <div>
              <h2 id="budget-modal-title" class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Gestión de Presupuestos & Alertas
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Fija techos de gasto mensual con disparador automático de notificaciones push
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
          <!-- Total Budget Progress Header -->
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
                [class.bg-emerald-100]="globalRatio() < 75"
                [class.text-emerald-700]="globalRatio() < 75"
                [class.bg-amber-100]="globalRatio() >= 75 && globalRatio() < 100"
                [class.text-amber-700]="globalRatio() >= 75 && globalRatio() < 100"
                [class.bg-rose-100]="globalRatio() >= 100"
                [class.text-rose-700]="globalRatio() >= 100"
              >
                {{ globalRatio().toFixed(1) }}% consumido
              </span>
            </div>

            <!-- Global Progress Bar -->
            <div class="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                [style.width.%]="Math.min(100, globalRatio())"
                [class.bg-emerald-500]="globalRatio() < 75"
                [class.bg-amber-500]="globalRatio() >= 75 && globalRatio() < 100"
                [class.bg-rose-500]="globalRatio() >= 100"
              ></div>
            </div>
          </div>

          <!-- Active Category Budgets List -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">
                Presupuestos por Categoría
              </h3>
              <button
                (click)="showCreateForm.set(!showCreateForm())"
                class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <mat-icon class="text-sm">{{ showCreateForm() ? 'remove' : 'add' }}</mat-icon>
                <span>{{ showCreateForm() ? 'Cerrar editor' : 'Añadir / Editar Presupuesto' }}</span>
              </button>
            </div>

            <div class="space-y-3">
              @for (budget of budgetService.budgets(); track budget.id) {
                @let spent = financeService.categorySpentMap()[budget.categoryId] || 0;
                @let pct = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;

                <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 transition-all hover:shadow-xs">
                  <div class="flex items-center justify-between gap-3 mb-2">
                    <div class="flex items-center gap-2.5">
                      <span
                        class="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs"
                        [style.backgroundColor]="budget.categoryColor"
                      >
                        <mat-icon class="text-sm">{{ budget.categoryIcon }}</mat-icon>
                      </span>
                      <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {{ budget.categoryName }}
                      </span>
                    </div>

                    <div class="flex items-center gap-3">
                      <span class="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {{ spent | currencyFormat: 'EUR' }}
                        <span class="text-slate-400 font-normal">/ {{ budget.monthlyLimit | currencyFormat: 'EUR' }}</span>
                      </span>

                      <!-- Status tag -->
                      @if (pct >= 100) {
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <mat-icon class="text-xs">error</mat-icon> Excedido
                        </span>
                      } @else if (pct >= 75) {
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <mat-icon class="text-xs">warning</mat-icon> {{ Math.round(pct) }}%
                        </span>
                      } @else {
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                          {{ Math.round(pct) }}%
                        </span>
                      }

                      <button
                        (click)="budgetService.deleteBudget(budget.id)"
                        class="p-1 text-slate-300 hover:text-rose-500 rounded-lg"
                        title="Eliminar presupuesto"
                        aria-label="Eliminar presupuesto"
                      >
                        <mat-icon class="text-sm">delete_outline</mat-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Progress Bar -->
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

          <!-- Quick Budget Form -->
          @if (showCreateForm()) {
            <div class="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                Fijar Techo de Gasto para una Categoría
              </h4>

              <form [formGroup]="budgetForm" (ngSubmit)="onSaveBudget()" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="b-category" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Categoría
                  </label>
                  <select
                    id="b-category"
                    formControlName="categoryId"
                    class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  >
                    @for (cat of expenseCategories(); track cat.id) {
                      <option [value]="cat.id">{{ cat.name }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label for="b-limit" class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Límite Mensual (€)
                  </label>
                  <input
                    id="b-limit"
                    type="number"
                    step="10"
                    formControlName="monthlyLimit"
                    placeholder="300"
                    class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div class="sm:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    (click)="showCreateForm.set(false)"
                    class="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200/50 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    [disabled]="budgetForm.invalid"
                    class="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    Guardar Presupuesto
                  </button>
                </div>
              </form>
            </div>
          }

          <!-- Automatic Alerts Log -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <mat-icon class="text-sm text-amber-500">notifications_active</mat-icon>
                Historial de Alertas de Presupuesto
              </h3>
              @if (budgetService.alerts().length > 0) {
                <button
                  (click)="budgetService.clearAllAlerts()"
                  class="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  Limpiar historial
                </button>
              }
            </div>

            <div class="space-y-2">
              @for (alert of budgetService.alerts(); track alert.id) {
                <div
                  class="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs"
                  [class.bg-rose-50]="alert.severity === 'danger'"
                  [class.border-rose-200]="alert.severity === 'danger'"
                  [class.dark:bg-rose-950/20]="alert.severity === 'danger'"
                  [class.dark:border-rose-900/40]="alert.severity === 'danger'"
                  [class.bg-amber-50]="alert.severity === 'warning'"
                  [class.border-amber-200]="alert.severity === 'warning'"
                  [class.dark:bg-amber-950/20]="alert.severity === 'warning'"
                  [class.dark:border-amber-900/40]="alert.severity === 'warning'"
                  [class.bg-blue-50]="alert.severity === 'info'"
                  [class.border-blue-200]="alert.severity === 'info'"
                  [class.dark:bg-blue-950/20]="alert.severity === 'info'"
                  [class.dark:border-blue-900/40]="alert.severity === 'info'"
                >
                  <div class="flex items-center gap-2.5">
                    <mat-icon
                      class="text-base"
                      [class.text-rose-600]="alert.severity === 'danger'"
                      [class.text-amber-600]="alert.severity === 'warning'"
                      [class.text-blue-600]="alert.severity === 'info'"
                    >
                      {{ alert.severity === 'danger' ? 'error' : 'warning' }}
                    </mat-icon>
                    <div>
                      <p class="font-bold text-slate-900 dark:text-white">
                        {{ alert.categoryName }}: {{ alert.thresholdTriggered }}% superado
                      </p>
                      <p class="text-[11px] text-slate-600 dark:text-slate-300">
                        Gastado {{ alert.spent | currencyFormat: 'EUR' }} de {{ alert.limit | currencyFormat: 'EUR' }} ({{ alert.percentage }}%)
                      </p>
                    </div>
                  </div>

                  <span class="text-[10px] text-slate-400 whitespace-nowrap">
                    {{ alert.createdAt | dateFormat: 'relative' }}
                  </span>
                </div>
              } @empty {
                <p class="text-center py-4 text-xs text-slate-400">
                  No hay alertas de presupuesto activas. ¡Tus gastos se mantienen dentro de los límites!
                </p>
              }
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
          <span class="text-xs text-slate-400">
            Alertas automáticas enviadas vía Web Push API
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
export class BudgetManagerModal {
  readonly budgetService = inject(BudgetService);
  readonly financeService = inject(FinanceService);

  readonly closeModal = output<void>();
  readonly showCreateForm = signal<boolean>(false);
  readonly Math = Math;

  readonly expenseCategories = () =>
    this.financeService.categories().filter((c) => c.type === 'expense');

  readonly globalRatio = () => {
    const totalLimit = this.budgetService.totalBudgetLimit();
    if (totalLimit <= 0) return 0;
    return (this.financeService.totalExpense() / totalLimit) * 100;
  };

  readonly budgetForm = new FormGroup({
    categoryId: new FormControl<string>('cat_food', { nonNullable: true }),
    monthlyLimit: new FormControl<number>(350, [Validators.required, Validators.min(10)]),
  });

  onSaveBudget(): void {
    if (this.budgetForm.invalid) return;
    const { categoryId, monthlyLimit } = this.budgetForm.getRawValue();
    const cat = this.financeService.categories().find((c) => c.id === categoryId);
    if (cat) {
      this.budgetService.setBudget(cat.id, cat.name, cat.color, cat.icon, Number(monthlyLimit));
      this.showCreateForm.set(false);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }
}
