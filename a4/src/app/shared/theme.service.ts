import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

/**
 * Service to manage theme (light/dark mode) across the app.
 * Persists to localStorage so preference survives page refreshes.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly THEME_KEY = 'app-theme-mode';
  private readonly defaultTheme: ThemeMode = 'light';

  /** Current theme mode as a writable signal. */
  private readonly themeSignal = signal<ThemeMode>(this.getStoredTheme());

  /** Read-only view of current theme. */
  readonly theme = this.themeSignal.asReadonly();

  /** Computed: true when in dark mode. */
  readonly isDarkMode = computed(() => this.themeSignal() === 'dark');

  constructor() {
    // Apply theme immediately on initialization
    const initialTheme = this.themeSignal();
    this.applyThemeToDocument(initialTheme);

    // Apply theme changes to document whenever the signal changes (only in browser)
    if (this.isBrowser) {
      effect(() => {
        const mode = this.themeSignal();
        this.applyThemeToDocument(mode);
      });
    }
  }

  /** Toggle between light and dark mode. */
  toggleTheme(): void {
    const current = this.themeSignal();
    const next: ThemeMode = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  /** Set theme to a specific mode. */
  setTheme(mode: ThemeMode): void {
    this.themeSignal.set(mode);
    if (this.isBrowser) {
      try {
        localStorage.setItem(this.THEME_KEY, mode);
      } catch {
        // Silently fail if localStorage is unavailable
      }
    }
  }

  /** Get the stored theme from localStorage or return default. */
  private getStoredTheme(): ThemeMode {
    if (!this.isBrowser) {
      return this.defaultTheme;
    }

    try {
      const stored = localStorage.getItem(this.THEME_KEY) as ThemeMode | null;
      if (stored && (stored === 'light' || stored === 'dark')) {
        return stored;
      }
    } catch {
      // Silently fail if localStorage is unavailable
    }

    return this.defaultTheme;
  }

  /** Apply theme class to document root so CSS can react. */
  private applyThemeToDocument(mode: ThemeMode): void {
    if (!this.isBrowser) {
      return;
    }

    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark-mode');
      root.classList.remove('light-mode');
    } else {
      root.classList.add('light-mode');
      root.classList.remove('dark-mode');
    }
  }
}
