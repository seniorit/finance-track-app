import { Injectable, signal, computed, effect } from '@angular/core';
import { SafeStorage } from '../core/utils/storage.util';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_STORAGE_KEY = 'fintrack_theme';

  // System dark preference signal
  readonly systemPrefersDark = signal<boolean>(this.getSystemDarkPreference());

  // Current selected theme mode
  readonly currentTheme = signal<ThemeMode>(
    SafeStorage.getItem<ThemeMode>(this.THEME_STORAGE_KEY, 'system')
  );

  // Computed whether dark mode is currently active
  readonly isDarkMode = computed<boolean>(() => {
    const theme = this.currentTheme();
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return this.systemPrefersDark();
  });

  constructor() {
    this.initSystemListener();

    // Effect to apply dark class to DOM and persist preference
    effect(() => {
      const isDark = this.isDarkMode();
      const theme = this.currentTheme();

      this.applyDomTheme(isDark);
      SafeStorage.setItem(this.THEME_STORAGE_KEY, theme);
    });
  }

  private getSystemDarkPreference(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  }

  private initSystemListener(): void {
    if (typeof window === 'undefined') return;
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        this.systemPrefersDark.set(e.matches);
      });
    } catch {
      // mediaQuery listener not supported
    }
  }

  private applyDomTheme(isDark: boolean): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;

    if (isDark) {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }

  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);
  }

  toggleDarkMode(): void {
    // If currently dark (either via 'dark' or system), switch to 'light'.
    // If currently light, switch to 'dark'.
    const nextTheme: ThemeMode = this.isDarkMode() ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }
}
