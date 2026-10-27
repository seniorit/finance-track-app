import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-nav-link-item',
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <a
      [routerLink]="route()"
      routerLinkActive="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold shadow-xs"
      [routerLinkActiveOptions]="{ exact: exact() }"
      class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all duration-150 group cursor-pointer"
    >
      <div class="flex items-center gap-3">
        <mat-icon
          class="text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-150"
        >
          {{ icon() }}
        </mat-icon>
        <span>{{ label() }}</span>
      </div>

      @if (badge()) {
        <span
          class="text-xs px-2 py-0.5 rounded-full font-bold"
          [class]="badgeClass()"
        >
          {{ badge() }}
        </span>
      }
    </a>
  `,
})
export class NavLinkItem {
  readonly route = input.required<string | string[]>();
  readonly label = input.required<string>();
  readonly icon = input.required<string>();
  readonly badge = input<string | number | null>(null);
  readonly badgeClass = input<string>('bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300');
  readonly exact = input<boolean>(false);
}
