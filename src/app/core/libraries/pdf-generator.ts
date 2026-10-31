import { jsPDF } from 'jspdf';
import { Transaction } from '../../models/transaction.model';
import { Budget } from '../../models/budget.model';

export interface PdfExportOptions {
  userName: string;
  userEmail: string;
  currency: string;
  dateRange: string;
  transactions: Transaction[];
  budgets: Budget[];
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export class PdfGenerator {
  static generateReport(options: PdfExportOptions): void {
    if (typeof window === 'undefined') return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Background header bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Accent line
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 27, pageWidth, 1.5, 'F');

    // Title & Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('FINTRACK PRO', margin, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text('Informe Financiero & Gestión de Gastos', margin, 21);

    // Date & User
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    const dateStr = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    doc.text(`Generado: ${dateStr}`, pageWidth - margin, 12, { align: 'right' });
    doc.text(`Usuario: ${options.userName} (${options.userEmail})`, pageWidth - margin, 18, { align: 'right' });
    doc.text(`Período: ${options.dateRange}`, pageWidth - margin, 23, { align: 'right' });

    let currentY = 36;

    // Executive Summary Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Resumen Ejecutivo del Período', margin, currentY);
    currentY += 5;

    const currencySymbol = options.currency === 'USD' ? '$' : 'Bs.';
    const formatMoney = (val: number) => {
      const parts = Math.abs(val).toFixed(2).split('.');
      parts[0] = (parts[0] ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `${currencySymbol} ${parts.join(',')}`;
    };

    // Metric Cards Grid (4 boxes)
    const boxWidth = (pageWidth - margin * 2 - 9) / 4;
    const boxHeight = 20;

    const metrics = [
      { label: 'INGRESOS TOTALES', value: `+${formatMoney(options.totalIncome)}`, color: [16, 185, 129] },
      { label: 'GASTOS TOTALES', value: `-${formatMoney(options.totalExpense)}`, color: [239, 68, 68] },
      {
        label: 'BALANCE NETO',
        value: `${options.netBalance >= 0 ? '+' : '-'}${formatMoney(options.netBalance)}`,
        color: options.netBalance >= 0 ? [59, 130, 246] : [239, 68, 68],
      },
      {
        label: 'TASA DE AHORRO',
        value: options.totalIncome > 0
          ? `${Math.max(0, Math.round(((options.totalIncome - options.totalExpense) / options.totalIncome) * 100))}%`
          : '0%',
        color: [99, 102, 241],
      },
    ];

    metrics.forEach((m, i) => {
      const boxX = margin + i * (boxWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 2, 2, 'FD');

      // Top color indicator line
      doc.setFillColor(m.color[0], m.color[1], m.color[2]);
      doc.rect(boxX, currentY, boxWidth, 1.2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(m.label, boxX + 3, currentY + 6.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(m.color[0], m.color[1], m.color[2]);
      doc.text(m.value, boxX + 3, currentY + 15);
    });

    currentY += boxHeight + 8;

    // Category Breakdown Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Distribución de Gastos por Categoría', margin, currentY);
    currentY += 4;

    // Calculate category totals
    const catTotals: Record<string, { name: string; amount: number; count: number }> = {};
    options.transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const key = t.categoryId;
        if (!catTotals[key]) {
          catTotals[key] = { name: t.categoryName || t.categoryId, amount: 0, count: 0 };
        }
        catTotals[key].amount += t.amount;
        catTotals[key].count += 1;
      });

    const sortedCats = Object.values(catTotals).sort((a, b) => b.amount - a.amount);

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, pageWidth - margin * 2, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Categoría', margin + 3, currentY + 4.2);
    doc.text('Transacciones', margin + 70, currentY + 4.2);
    doc.text('% del Total', margin + 110, currentY + 4.2);
    doc.text('Gasto Total', pageWidth - margin - 3, currentY + 4.2, { align: 'right' });
    currentY += 6.5;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    sortedCats.slice(0, 6).forEach((cat) => {
      const pct = options.totalExpense > 0 ? ((cat.amount / options.totalExpense) * 100).toFixed(1) : '0';
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(cat.name, margin + 3, currentY + 3.8);
      doc.text(`${cat.count} movs`, margin + 70, currentY + 3.8);
      doc.text(`${pct}%`, margin + 110, currentY + 3.8);
      doc.text(formatMoney(cat.amount), pageWidth - margin - 3, currentY + 3.8, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, currentY + 5.5, pageWidth - margin, currentY + 5.5);
      currentY += 6;
    });

    currentY += 4;

    // Recent Transactions List Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Detalle de Movimientos con Tasa Oficial BCV', margin, currentY);
    currentY += 4;

    // Transactions Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, pageWidth - margin * 2, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Fecha', margin + 3, currentY + 4.2);
    doc.text('Concepto / Descripción', margin + 26, currentY + 4.2);
    doc.text('Categoría', margin + 82, currentY + 4.2);
    doc.text('Tasa BCV', margin + 120, currentY + 4.2);
    doc.text('Monto (VES) / Equiv. USD', pageWidth - margin - 3, currentY + 4.2, { align: 'right' });
    currentY += 6.5;

    // Draw rows
    const recentTx = options.transactions.slice(0, 16);
    recentTx.forEach((tx) => {
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text(tx.date, margin + 3, currentY + 3.8);

      const truncatedDesc = tx.description.length > 30 ? tx.description.slice(0, 28) + '...' : tx.description;
      doc.text(truncatedDesc, margin + 26, currentY + 3.8);
      doc.text(tx.categoryName || tx.categoryId, margin + 82, currentY + 3.8);

      const rateText = tx.exchangeRate ? `${tx.exchangeRate.toFixed(2)} Bs./$` : 'Oficial';
      doc.text(rateText, margin + 120, currentY + 3.8);

      const usdVal = tx.amountUsd ?? (tx.exchangeRate ? tx.amount / tx.exchangeRate : 0);
      const usdStr = usdVal > 0 ? ` ($${usdVal.toFixed(2)})` : '';
      const sign = tx.type === 'expense' ? '-' : '+';
      const formattedAmount = `${sign}${formatMoney(tx.amount)}${usdStr}`;

      doc.setFont('helvetica', 'bold');
      if (tx.type === 'expense') {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(16, 185, 129);
      }
      doc.text(formattedAmount, pageWidth - margin - 3, currentY + 3.8, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, currentY + 5.2, pageWidth - margin, currentY + 5.2);
      currentY += 5.8;
    });

    // Footer on all pages
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      doc.text('Fintrack Pro • Reporte Confidencial Generado Automáticamente', margin, pageHeight - 5.5);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 5.5, { align: 'right' });
    }

    doc.save(`fintrack_reporte_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
}
