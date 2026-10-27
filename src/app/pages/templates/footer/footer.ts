import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-footer',
  imports: [MatIconModule],
  template: `
    <footer class="mt-auto border-t border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-6 px-4 md:px-8 text-xs text-slate-500 dark:text-slate-400">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Brand & Security info -->
        <div class="flex flex-wrap items-center gap-4 text-center md:text-left">
          <div class="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
            <mat-icon class="text-emerald-500 text-sm">lock</mat-icon>
            <span>Cifrado TLS 1.3 / AES-256</span>
          </div>
          <span class="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <div class="flex items-center gap-1.5">
            <mat-icon class="text-blue-500 text-sm">verified_user</mat-icon>
            <span>Protocolo Open Banking PSD2</span>
          </div>
          <span class="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <div class="flex items-center gap-1.5">
            <mat-icon class="text-purple-500 text-sm">notifications_active</mat-icon>
            <span>Push Notifications en Tiempo Real</span>
          </div>
        </div>

        <!-- Copyright -->
        <div class="text-slate-400 dark:text-slate-500 text-center md:text-right">
          © 2026 Fintrack Pro. Diseñado para alto rendimiento y accesibilidad web y móvil.
        </div>
      </div>
    </footer>
  `,
})
export class Footer {}
