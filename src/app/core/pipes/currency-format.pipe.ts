import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat',
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    currencyCode = 'VES',
    showSign = false,
    showUsdEquivalent = false,
    exchangeRate?: number
  ): string {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return currencyCode === 'USD' ? '$ 0.00' : 'Bs. 0,00';
    }

    const num = Number(value);
    const signPrefix = showSign && num > 0 ? '+' : num < 0 ? '-' : '';
    const absNum = Math.abs(num);

    if (currencyCode === 'USD') {
      try {
        const formatted = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(absNum);
        return `${signPrefix}$ ${formatted}`;
      } catch {
        return `${signPrefix}$ ${absNum.toFixed(2)}`;
      }
    }

    if (currencyCode === 'EUR') {
      try {
        const formatted = new Intl.NumberFormat('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(absNum);
        return `${signPrefix}${formatted} €`;
      } catch {
        return `${signPrefix}${absNum.toFixed(2)} €`;
      }
    }

    // Default: Bolívares (VES)
    let vesFormatted: string;
    try {
      vesFormatted = new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(absNum);
    } catch {
      // Manual Spanish number format fallback (1.234,56)
      const parts = absNum.toFixed(2).split('.');
      parts[0] = (parts[0] ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      vesFormatted = parts.join(',');
    }

    const mainResult = `${signPrefix}Bs. ${vesFormatted}`;

    if (showUsdEquivalent && exchangeRate && exchangeRate > 0) {
      const usdVal = absNum / exchangeRate;
      const usdFormatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(usdVal);
      return `${mainResult} (≈ $${usdFormatted})`;
    }

    return mainResult;
  }
}

