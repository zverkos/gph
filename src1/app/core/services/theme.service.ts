import { Injectable, signal } from '@angular/core';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'gph_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _isDark = signal(this.loadTheme() === 'dark');

  readonly isDark = this._isDark.asReadonly();

  toggleTheme() {
    this._isDark.update((v) => !v);
    this.saveTheme(this._isDark() ? 'dark' : 'light');
  }

  setTheme(theme: Theme) {
    this._isDark.set(theme === 'dark');
    this.saveTheme(theme);
  }

  private loadTheme(): Theme {
    if (typeof localStorage === 'undefined') return 'light';
    try {
      return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || 'light';
    } catch {
      return 'light';
    }
  }

  private saveTheme(theme: Theme) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-color-scheme', theme);
      }
    } catch {
      // ignore
    }
  }
}
