import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface BcvApiResponse {
  success: boolean;
  rate: number; // Euro rate
  dollarRate: number; // USD BCV official rate
  usdRate?: number;
  currency: string;
  currencyName: string;
  source: string;
  fechaValor: string;
  lastUpdated: string;
  date: string;
}

@Injectable({
  providedIn: 'root',
})
export class BcvService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  // Default initial reference rate: 52.45 Bs./$
  readonly dollarRate = signal<number>(52.45);
  readonly euroRate = signal<number>(57.20);
  readonly fechaValor = signal<string>('Fecha Oficial BCV');
  readonly lastUpdated = signal<string>('En línea');
  readonly source = signal<string>('Banco Central de Venezuela (BCV)');
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Global display mode preference: 'VES' (Primary), 'DUAL' (Bs. with USD equivalent), 'USD'
  readonly displayMode = signal<'VES' | 'DUAL'>('DUAL');

  // Cache of manual/historical rates for specific operation dates
  private readonly historicalRateCache = new Map<string, number>();

  constructor() {
    if (this.isBrowser) {
      // Load cached rate from localStorage if available
      try {
        const storedRate = localStorage.getItem('fintrack_bcv_rate');
        if (storedRate) {
          const parsed = parseFloat(storedRate);
          if (Number.isFinite(parsed) && parsed > 0) {
            this.dollarRate.set(parsed);
          }
        }
        const storedDate = localStorage.getItem('fintrack_bcv_fecha');
        if (storedDate) {
          this.fechaValor.set(storedDate);
        }
      } catch {
        // Ignore storage errors
      }

      // Automatically fetch current live rate
      this.loadRates();
    }
  }

  /**
   * Fetches the latest live exchange rates from the backend BCV proxy endpoint
   */
  async loadRates(force = false): Promise<void> {
    if (!this.isBrowser) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const url = force ? '/api/bcv?refresh=true' : '/api/bcv';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Servidor BCV respondió con status ${response.status}`);
      }

      const data: BcvApiResponse = await response.json();
      
      const newDollarRate = Number(data.dollarRate || data.usdRate);
      if (Number.isFinite(newDollarRate) && newDollarRate > 0) {
        this.dollarRate.set(newDollarRate);
        try {
          localStorage.setItem('fintrack_bcv_rate', String(newDollarRate));
        } catch {
          // ignore localStorage access issues
        }
      }

      if (Number.isFinite(data.rate) && data.rate > 0) {
        this.euroRate.set(data.rate);
      }

      if (data.fechaValor) {
        this.fechaValor.set(data.fechaValor);
        try {
          localStorage.setItem('fintrack_bcv_fecha', data.fechaValor);
        } catch {
          // ignore localStorage access issues
        }
      }

      if (data.lastUpdated) {
        this.lastUpdated.set(data.lastUpdated);
      }

      if (data.source) {
        this.source.set(data.source);
      }
    } catch (err) {
      console.warn('[BcvService] Falló consulta al proxy /api/bcv, intentando fallback directo DolarAPI:', err);
      
      // Secondary client-side fallback directly to DolarAPI
      try {
        const directRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData && Number(directData.promedio) > 0) {
            this.dollarRate.set(Number(directData.promedio));
            this.source.set('DolarAPI BCV Oficial (Directo)');
            if (directData.fechaActualizacion) {
              const dt = new Date(directData.fechaActualizacion);
              this.fechaValor.set(`Actualizado: ${dt.toLocaleDateString('es-VE')}`);
            }
          }
        }
      } catch {
        this.error.set('No se pudo actualizar la tasa BCV en vivo. Usando tasa de respaldo.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Converts Bolívares (VES) to US Dollars (USD) based on the supplied rate or current BCV rate
   */
  vesToUsd(vesAmount: number, customRate?: number): number {
    const rate = customRate && customRate > 0 ? customRate : this.dollarRate();
    if (rate <= 0) return 0;
    return vesAmount / rate;
  }

  /**
   * Converts US Dollars (USD) to Bolívares (VES) based on the supplied rate or current BCV rate
   */
  usdToVes(usdAmount: number, customRate?: number): number {
    const rate = customRate && customRate > 0 ? customRate : this.dollarRate();
    return usdAmount * rate;
  }

  /**
   * Returns the BCV rate applicable for a given operation date.
   * If a historical rate is cached for that date, it is returned; otherwise current rate.
   */
  getRateForDate(dateStr: string): number {
    if (this.historicalRateCache.has(dateStr)) {
      return this.historicalRateCache.get(dateStr)!;
    }
    return this.dollarRate();
  }

  /**
   * Records a custom or historical rate for a specific date
   */
  setRateForDate(dateStr: string, rate: number): void {
    if (Number.isFinite(rate) && rate > 0) {
      this.historicalRateCache.set(dateStr, rate);
    }
  }

  /**
   * Formats an amount in Bolívares (VES)
   */
  formatVes(amount: number): string {
    const absVal = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    try {
      const formatted = new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(absVal);
      return `${sign}Bs. ${formatted}`;
    } catch {
      return `${sign}Bs. ${absVal.toFixed(2)}`;
    }
  }

  /**
   * Formats an amount in US Dollars (USD)
   */
  formatUsd(amount: number): string {
    const absVal = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    try {
      const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(absVal);
      return `${sign}$ ${formatted}`;
    } catch {
      return `${sign}$ ${absVal.toFixed(2)}`;
    }
  }

  /**
   * Formats an amount displaying both Bolívares and the equivalent in USD based on reference rate
   */
  formatDual(vesAmount: number, exchangeRate?: number): string {
    const vesStr = this.formatVes(vesAmount);
    const rate = exchangeRate && exchangeRate > 0 ? exchangeRate : this.dollarRate();
    const usdVal = this.vesToUsd(vesAmount, rate);
    const usdStr = this.formatUsd(usdVal);
    return `${vesStr} (≈ ${usdStr})`;
  }
}
