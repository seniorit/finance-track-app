import { Component, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FinanceService } from '../../../services/finance.service';
import { BudgetService } from '../../../services/budget.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { PdfGenerator } from '../../../core/libraries/pdf-generator';
import { CsvExporter } from '../../../core/libraries/csv-exporter';
import { CurrencyFormatPipe } from '../../../core/pipes/currency-format.pipe';

@Component({
  selector: 'app-export-modal',
  imports: [MatIconModule, CurrencyFormatPipe],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      (click)="onBackdropClick($event)"
      (keydown.escape)="closeModal.emit()"
      tabindex="0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div
        class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        tabindex="0"
        role="document"
      >
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <mat-icon>file_download</mat-icon>
            </div>
            <div>
              <h2 id="export-modal-title" class="text-base font-bold text-slate-900 dark:text-white">
                Exportación de Reportes Financieros
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Descarga tus datos en formato PDF con diseño ejecutivo o archivo CSV tabulado
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

        <div class="p-6 space-y-6">
          <!-- Summary Preview Card -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Resumen a Exportar</span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {{ financeService.transactions().length }} transacciones
              </span>
            </div>

            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-[10px] uppercase font-bold text-slate-400 block">Ingresos</span>
                <span class="text-sm font-bold text-emerald-600 font-mono">
                  +{{ financeService.totalIncome() | currencyFormat: 'EUR' }}
                </span>
              </div>
              <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-[10px] uppercase font-bold text-slate-400 block">Gastos</span>
                <span class="text-sm font-bold text-rose-600 font-mono">
                  -{{ financeService.totalExpense() | currencyFormat: 'EUR' }}
                </span>
              </div>
              <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-[10px] uppercase font-bold text-slate-400 block">Neto</span>
                <span class="text-sm font-bold text-blue-600 font-mono">
                  {{ financeService.netBalance() | currencyFormat: 'EUR': true }}
                </span>
              </div>
            </div>
          </div>

          <!-- Export Option 1: PDF Executive Report -->
          <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <mat-icon class="text-2xl">picture_as_pdf</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Informe Financiero Oficial (PDF)
                  <span class="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded">
                    Recomendado
                  </span>
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Documento formal A4 con métricas clave, distribución por categorías, presupuestos y balance.
                </p>
              </div>
            </div>

            <button
              (click)="exportPdf()"
              [disabled]="isExportingPdf()"
              class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <mat-icon class="text-sm">download</mat-icon>
              <span>{{ isExportingPdf() ? 'Generando...' : 'Descargar PDF' }}</span>
            </button>
          </div>

          <!-- Export Option 2: CSV Data -->
          <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <mat-icon class="text-2xl">table_chart</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                  Hoja de Cálculo / Datos Crudos (CSV)
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Archivo compatible con Microsoft Excel, Google Sheets o Apple Numbers con codificación UTF-8.
                </p>
              </div>
            </div>

            <button
              (click)="exportCsv()"
              class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <mat-icon class="text-sm">download</mat-icon>
              <span>Descargar CSV</span>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex justify-end">
          <button
            (click)="closeModal.emit()"
            class="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ExportModal {
  readonly financeService = inject(FinanceService);
  private readonly budgetService = inject(BudgetService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly closeModal = output<void>();
  readonly isExportingPdf = signal<boolean>(false);

  exportPdf(): void {
    this.isExportingPdf.set(true);

    try {
      const user = this.authService.currentUser();
      PdfGenerator.generateReport({
        userName: user?.name || 'Usuario Fintrack',
        userEmail: user?.email || 'usuario@fintrack.io',
        currency: 'EUR',
        dateRange: 'Mes Actual (Octubre 2026)',
        transactions: this.financeService.transactions(),
        budgets: this.budgetService.budgets(),
        totalIncome: this.financeService.totalIncome(),
        totalExpense: this.financeService.totalExpense(),
        netBalance: this.financeService.netBalance(),
      });

      this.notificationService.sendNotification(
        'Informe PDF Descargado',
        'Tu reporte financiero mensual en formato PDF ha sido generado y descargado.',
        'system',
        'picture_as_pdf'
      );
    } catch (err) {
      console.error('Error al generar PDF', err);
    } finally {
      this.isExportingPdf.set(false);
    }
  }

  exportCsv(): void {
    CsvExporter.exportTransactions(
      this.financeService.transactions(),
      `fintrack_movimientos_${new Date().toISOString().slice(0, 10)}.csv`
    );

    this.notificationService.sendNotification(
      'Archivo CSV Generado',
      'Tus transacciones se han exportado en archivo CSV para Excel o Google Sheets.',
      'system',
      'table_chart'
    );
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }
}
