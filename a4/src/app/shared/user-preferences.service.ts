import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface UserPreferences {
  pageSize: number;
  defaultSortKey: string;
  defaultSortDirection: 'asc' | 'desc';
  themeMode: 'light' | 'dark';
}

/**
 * Service to manage user preferences (page size, sort defaults, theme).
 * Persists to localStorage for cross-session consistency.
 */
@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly PREFERENCES_KEY = 'app-user-preferences';

  private readonly defaultPreferences: UserPreferences = {
    pageSize: 10,
    defaultSortKey: 'id',
    defaultSortDirection: 'asc',
    themeMode: 'light',
  };

  /** User preferences as a writable signal. */
  private readonly preferencesSignal = signal<UserPreferences>(this.getStoredPreferences());

  /** Read-only view of preferences. */
  readonly preferences = this.preferencesSignal.asReadonly();

  constructor() {
    // Persist changes to localStorage whenever preferences change (only in browser)
    if (this.isBrowser) {
      effect(() => {
        const prefs = this.preferencesSignal();
        this.persistPreferences(prefs);
      });
    }
  }

  /** Update a single preference field. */
  updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void {
    const current = this.preferencesSignal();
    this.preferencesSignal.set({ ...current, [key]: value });
  }

  /** Update multiple preferences at once. */
  updatePreferences(updates: Partial<UserPreferences>): void {
    const current = this.preferencesSignal();
    this.preferencesSignal.set({ ...current, ...updates });
  }

  /** Reset all preferences to defaults. */
  resetPreferences(): void {
    this.preferencesSignal.set({ ...this.defaultPreferences });
  }

  /** Get stored preferences from localStorage or return defaults. */
  private getStoredPreferences(): UserPreferences {
    if (!this.isBrowser) {
      return { ...this.defaultPreferences };
    }

    try {
      const stored = localStorage.getItem(this.PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.defaultPreferences, ...parsed };
      }
    } catch {
      // Ignore parse errors, use defaults
    }
    return { ...this.defaultPreferences };
  }

  /** Persist preferences to localStorage. */
  private persistPreferences(prefs: UserPreferences): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(prefs));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }
}

