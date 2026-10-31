import { Transaction } from '../../models/transaction.model';

export class CsvExporter {
  static exportTransactions(transactions: Transaction[], filename = 'fintrack_transacciones.csv'): void {
    if (typeof window === 'undefined') return;

    const headers = [
      'ID',
      'Fecha',
      'Tipo',
      'Categoría',
      'Descripción',
      'Monto (Bs. VES)',
      'Tasa BCV (Bs./$)',
      'Equivalente ($ USD)',
      'Cuenta',
      'Estado',
      'Es Recurrente',
      'Notas',
    ];

    const rows = transactions.map((t) => {
      const rate = t.exchangeRate || 0;
      const usdAmount = t.amountUsd ?? (rate > 0 ? t.amount / rate : 0);
      return [
        t.id,
        t.date,
        t.type === 'expense' ? 'Gasto' : 'Ingreso',
        `"${(t.categoryName || t.categoryId).replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.amount.toFixed(2).replace('.', ','),
        rate > 0 ? rate.toFixed(2).replace('.', ',') : 'Oficial',
        usdAmount > 0 ? usdAmount.toFixed(2).replace('.', ',') : '0,00',
        `"${(t.accountName || t.accountId).replace(/"/g, '""')}"`,
        t.status === 'cleared' ? 'Confirmado' : 'Pendiente',
        t.isRecurring ? 'Sí' : 'No',
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
