import { Component, input, computed, signal } from '@angular/core';
import { CurrencyFormatPipe } from '../../../core/pipes/currency-format.pipe';

export interface MonthlyCashFlowItem {
  month: string;
  income: number;
  expense: number;
}

@Component({
  selector: 'app-cash-flow-chart',
  imports: [CurrencyFormatPipe],
  template: `
    <div class="relative w-full overflow-hidden select-none">
      <!-- Tooltip display -->
      @if (hoveredItem(); as item) {
        <div
          class="absolute top-2 right-2 sm:right-4 z-10 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs shadow-lg backdrop-blur-sm pointer-events-none transition-all flex items-center gap-3 border border-slate-700/60"
        >
          <span class="font-bold text-slate-300">{{ item.month }}:</span>
          <span class="text-emerald-400 font-medium">Ing: +{{ item.income | currencyFormat: 'VES' }}</span>
          <span class="text-rose-400 font-medium">Gas: -{{ item.expense | currencyFormat: 'VES' }}</span>
          <span class="font-bold text-blue-400">Neto: {{ (item.income - item.expense) | currencyFormat: 'VES': true }}</span>
        </div>
      }

      <!-- SVG Chart -->
      <svg
        viewBox="0 0 600 240"
        class="w-full h-56 sm:h-64 overflow-visible"
        aria-label="Gráfico de evolución mensual de ingresos y gastos"
      >
        <defs>
          <linearGradient id="incomeBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#059669" stop-opacity="0.75" />
          </linearGradient>
          <linearGradient id="expenseBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f43f5e" />
            <stop offset="100%" stop-color="#e11d48" stop-opacity="0.75" />
          </linearGradient>
          <linearGradient id="netAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Horizontal Guide Lines -->
        @for (line of gridLines(); track line.y) {
          <line
            x1="50"
            [attr.y1]="line.y"
            x2="580"
            [attr.y2]="line.y"
            class="stroke-slate-200/80 dark:stroke-slate-800"
            stroke-dasharray="4 4"
            stroke-width="1"
          />
          <text
            x="42"
            [attr.y]="line.y + 4"
            text-anchor="end"
            class="fill-slate-400 text-[10px] font-mono"
          >
            Bs. {{ line.label }}
          </text>
        }

        <!-- Net savings curve area & line -->
        @if (netCurvePath()) {
          <path [attr.d]="netAreaPath()" fill="url(#netAreaGrad)" />
          <path
            [attr.d]="netCurvePath()"
            fill="none"
            class="stroke-blue-500"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        }

        <!-- Bars for each month -->
        @for (b of computedBars(); track b.month; let idx = $index) {
          <g
            (mouseenter)="hoveredItem.set(b.raw)"
            (mouseleave)="hoveredItem.set(null)"
            class="cursor-pointer group"
          >
            <!-- Background hover highlight column -->
            <rect
              [attr.x]="b.colX"
              y="20"
              [attr.width]="b.colW"
              height="180"
              class="fill-slate-500/0 hover:fill-slate-500/10 transition-colors rounded-lg"
              rx="6"
            />

            <!-- Income Bar -->
            <rect
              [attr.x]="b.incomeX"
              [attr.y]="b.incomeY"
              [attr.width]="b.barW"
              [attr.height]="b.incomeH"
              fill="url(#incomeBarGrad)"
              rx="4"
              class="transition-all duration-300 group-hover:brightness-110"
            />

            <!-- Expense Bar -->
            <rect
              [attr.x]="b.expenseX"
              [attr.y]="b.expenseY"
              [attr.width]="b.barW"
              [attr.height]="b.expenseH"
              fill="url(#expenseBarGrad)"
              rx="4"
              class="transition-all duration-300 group-hover:brightness-110"
            />

            <!-- Month Label -->
            <text
              [attr.x]="b.colX + b.colW / 2"
              y="222"
              text-anchor="middle"
              class="fill-slate-500 dark:fill-slate-400 text-xs font-semibold group-hover:fill-emerald-500"
            >
              {{ b.month }}
            </text>

            <!-- Net curve point dot -->
            <circle
              [attr.cx]="b.colX + b.colW / 2"
              [attr.cy]="b.netY"
              r="4"
              class="fill-white dark:fill-slate-900 stroke-blue-500"
              stroke-width="2"
            />
          </g>
        }
      </svg>

      <!-- Legend -->
      <div class="mt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-300">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-md bg-emerald-500"></span>
          <span>Ingresos</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-md bg-rose-500"></span>
          <span>Gastos</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-1 bg-blue-500 rounded-full"></span>
          <span>Balance Neto</span>
        </div>
      </div>
    </div>
  `,
})
export class CashFlowChart {
  readonly data = input.required<MonthlyCashFlowItem[]>();
  readonly hoveredItem = signal<MonthlyCashFlowItem | null>(null);

  private readonly chartTop = 25;
  private readonly chartBottom = 200;
  private readonly chartHeight = this.chartBottom - this.chartTop;
  private readonly leftMargin = 55;
  private readonly rightMargin = 575;

  readonly maxVal = computed(() => {
    const list = this.data();
    if (!list.length) return 3000;
    const maxNumber = Math.max(
      ...list.map((d) => Math.max(d.income, d.expense))
    );
    return Math.ceil(maxNumber / 500) * 500 || 3000;
  });

  readonly gridLines = computed(() => {
    const max = this.maxVal();
    const steps = [0, 0.25, 0.5, 0.75, 1];
    return steps.map((s) => ({
      y: this.chartBottom - s * this.chartHeight,
      label: Math.round(s * max).toString(),
    }));
  });

  readonly computedBars = computed(() => {
    const items = this.data();
    const totalCols = items.length;
    if (totalCols === 0) return [];

    const availableW = this.rightMargin - this.leftMargin;
    const colW = availableW / totalCols;
    const barW = Math.min(22, (colW - 20) / 2);
    const max = this.maxVal();

    return items.map((item, idx) => {
      const colX = this.leftMargin + idx * colW;
      const incomeH = Math.max(2, (item.income / max) * this.chartHeight);
      const expenseH = Math.max(2, (item.expense / max) * this.chartHeight);

      const incomeX = colX + (colW / 2) - barW - 2;
      const expenseX = colX + (colW / 2) + 2;

      const incomeY = this.chartBottom - incomeH;
      const expenseY = this.chartBottom - expenseH;

      const net = item.income - item.expense;
      const netRatio = Math.max(0, Math.min(1, net / max));
      const netY = this.chartBottom - netRatio * this.chartHeight;

      return {
        month: item.month,
        raw: item,
        colX,
        colW,
        barW,
        incomeX,
        incomeY,
        incomeH,
        expenseX,
        expenseY,
        expenseH,
        netY,
      };
    });
  });

  readonly netCurvePath = computed(() => {
    const bars = this.computedBars();
    if (bars.length < 2) return '';
    const points = bars.map((b) => `${b.colX + b.colW / 2},${b.netY}`);
    return `M ${points.join(' L ')}`;
  });

  readonly netAreaPath = computed(() => {
    const bars = this.computedBars();
    if (bars.length < 2) return '';
    const curve = this.netCurvePath();
    const first = bars[0];
    const last = bars[bars.length - 1];
    return `${curve} L ${last.colX + last.colW / 2},${this.chartBottom} L ${first.colX + first.colW / 2},${this.chartBottom} Z`;
  });
}
