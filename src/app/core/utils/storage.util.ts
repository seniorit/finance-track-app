/**
 * Safe client-side storage utility that gracefully handles SSR environments
 * and JSON serialization/deserialization.
 */
export class SafeStorage {
  private static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  static getItem<T>(key: string, defaultValue: T): T {
    if (!this.isBrowser()) return defaultValue;
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  static setItem<T>(key: string, value: T): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage quota exceeded or storage unavailable', e);
    }
  }

  static removeItem(key: string): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove item from storage', e);
    }
  }

  static clear(): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage', e);
    }
  }
}
