import { Component, input, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Category } from '../../../models/transaction.model';
import { CurrencyFormatPipe } from '../../../core/pipes/currency-format.pipe';

export interface CategoryExpenseData {
  category: Category;
  amount: number;
  percentage: number;
  count: number;
}

interface SvgArc {
  path: string;
  color: string;
  category: Category;
  amount: number;
  percentage: number;
  count: number;
  midAngle: number;
}

@Component({
  selector: 'app-category-donut-chart',
  imports: [MatIconModule, CurrencyFormatPipe],
  template: `
    <div class="flex flex-col lg:flex-row items-center gap-6 select-none">
      <!-- Donut Circle with Center Stats -->
      <div class="relative w-48 h-48 sm:w-56 sm:h-56 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 200 200" class="w-full h-full transform -rotate-90 overflow-visible">
          <!-- Background track circle -->
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            class="stroke-slate-100 dark:stroke-slate-800"
            stroke-width="24"
          />

          <!-- Colored arcs -->
          @for (arc of arcs(); track arc.category.id) {
            <path
              [attr.d]="arc.path"
              [attr.stroke]="arc.color"
              stroke-width="24"
              fill="none"
              stroke-linecap="round"
              (mouseenter)="hoveredCat.set(arc)"
              (mouseleave)="hoveredCat.set(null)"
              class="cursor-pointer transition-all duration-300 hover:opacity-90 hover:stroke-[28]"
            />
          }
        </svg>

        <!-- Center content in donut hole -->
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
          @if (hoveredCat(); as active) {
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {{ active.category.name }}
            </span>
            <span class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">
              {{ active.amount | currencyFormat: 'VES' }}
            </span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5" [style.color]="active.color" [style.backgroundColor]="active.color + '22'">
              {{ active.percentage.toFixed(1) }}%
            </span>
          } @else {
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Gastos
            </span>
            <span class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">
              {{ totalExpense() | currencyFormat: 'VES' }}
            </span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400">
              {{ items().length }} categorías
            </span>
          }
        </div>
      </div>

      <!-- Categories breakdown legend list -->
      <div class="flex-1 w-full space-y-2.5 max-h-56 overflow-y-auto pr-1">
        @for (item of items(); track item.category.id) {
          <div
            (mouseenter)="setHoveredFromList(item)"
            (mouseleave)="hoveredCat.set(null)"
            class="flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer"
            [class.bg-slate-100]="hoveredCat()?.category?.id === item.category.id"
            [class.dark:bg-slate-800]="hoveredCat()?.category?.id === item.category.id"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <span
                class="w-3 h-3 rounded-full shrink-0 shadow-xs"
                [style.backgroundColor]="item.category.color"
              ></span>
              <div class="truncate">
                <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {{ item.category.name }}
                </p>
                <div class="w-24 sm:w-32 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    [style.width.%]="item.percentage"
                    [style.backgroundColor]="item.category.color"
                  ></div>
                </div>
              </div>
            </div>

            <div class="text-right shrink-0 pl-2">
              <p class="text-xs font-bold text-slate-900 dark:text-white font-mono">
                {{ item.amount | currencyFormat: 'VES' }}
              </p>
              <p class="text-[10px] font-medium text-slate-400">
                {{ item.percentage.toFixed(1) }}%
              </p>
            </div>
          </div>
        } @empty {
          <div class="py-6 text-center text-slate-400 text-xs">
            Sin gastos registrados aún.
          </div>
        }
      </div>
    </div>
  `,
})
export class CategoryDonutChart {
  readonly items = input.required<CategoryExpenseData[]>();
  readonly hoveredCat = signal<SvgArc | null>(null);

  readonly totalExpense = computed(() => {
    return this.items().reduce((sum, item) => sum + item.amount, 0);
  });

  readonly arcs = computed<SvgArc[]>(() => {
    const list = this.items();
    const total = this.totalExpense();
    if (total === 0 || list.length === 0) return [];

    const radius = 70;
    const cx = 100;
    const cy = 100;
    let currentAngle = 0;

    return list.map((item) => {
      const sliceAngle = (item.amount / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      const midAngle = currentAngle + sliceAngle / 2;
      currentAngle = endAngle;

      // Calculate path arc
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

      // Small gap buffer between slices
      const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

      return {
        path,
        color: item.category.color || '#3b82f6',
        category: item.category,
        amount: item.amount,
        percentage: item.percentage,
        count: item.count,
        midAngle,
      };
    });
  });

  setHoveredFromList(item: CategoryExpenseData): void {
    const found = this.arcs().find((a) => a.category.id === item.category.id);
    if (found) {
      this.hoveredCat.set(found);
    }
  }
}
