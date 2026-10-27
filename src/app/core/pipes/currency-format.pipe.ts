import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat',
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    currencyCode = 'EUR',
    showSign = false
  ): string {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return '0,00 €';
    }

    const num = Number(value);
    const signPrefix = showSign && num > 0 ? '+' : '';

    try {
      const formatted = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currencyCode || 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);

      return `${signPrefix}${formatted}`;
    } catch {
      // Fallback
      const symbol = currencyCode === 'USD' ? '$' : '€';
      return `${signPrefix}${num.toFixed(2)} ${symbol}`;
    }
  }
}
