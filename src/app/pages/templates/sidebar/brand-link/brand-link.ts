import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-brand-link',
  imports: [RouterLink, MatIconModule],
  template: `
    <a
      routerLink="/dashboard"
      class="flex items-center gap-3 px-3 py-2 rounded-xl group transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      aria-label="Fintrack Pro Dashboard"
    >
      <div
        class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform"
      >
        <mat-icon class="text-white text-xl">account_balance_wallet</mat-icon>
      </div>
      <div class="flex flex-col">
        <span class="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
          Fintrack
          <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300/60 dark:border-emerald-700/60">
            PRO
          </span>
        </span>
        <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Finanzas Inteligentes</span>
      </div>
    </a>
  `,
})
export class BrandLink {}
