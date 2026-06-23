import { Injectable, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

/**
 * Service to manage global keyboard shortcuts across the app.
 * Registers handlers for common actions (Ctrl+N = new, Ctrl+? = help, etc.)
 */
@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private registered = false;

  constructor() {
    // Register keyboard shortcuts when the service is created (only in browser)
    if (this.isBrowser) {
      this.registerShortcuts();
    }
  }

  private registerShortcuts(): void {
    if (this.registered) {
      return;
    }

    document.addEventListener('keydown', (event: KeyboardEvent) => {
      const isMeta = event.ctrlKey || event.metaKey; // Ctrl on Windows/Linux, Cmd on Mac

      // Ctrl/Cmd + N -> Create new (navigate to current-path/new)
      if (isMeta && event.key === 'n') {
        event.preventDefault();
        this.createNew();
      }

      // Ctrl/Cmd + ? or Shift+? -> Show keyboard shortcuts help
      if ((isMeta && event.key === '?') || (event.shiftKey && event.key === '?')) {
        event.preventDefault();
        this.showKeyboardHelp();
      }

      // Ctrl/Cmd + / -> Focus search (if on a list page)
      if (isMeta && event.key === '/') {
        event.preventDefault();
        this.focusSearch();
      }

      // Escape -> Close modals/dropdowns (browsers handle this naturally, but we can enhance)
      if (event.key === 'Escape') {
        this.closeOpenModals();
      }
    });

    this.registered = true;
  }

  private createNew(): void {
    const currentUrl = this.router.url.split('?')[0]; // Remove query params
    const newUrl = `${currentUrl}/new`;
    this.router.navigate([newUrl]);
  }

  private showKeyboardHelp(): void {
    const helpText = `
Keyboard Shortcuts
==================
Ctrl+N (or Cmd+N)    Create new record
Ctrl+? (or Cmd+?)    Show this help
Ctrl+/ (or Cmd+/)    Focus search field
Esc                  Close modals/dropdowns

These shortcuts are available throughout the app.
    `.trim();

    alert(helpText);
  }

  private focusSearch(): void {
    // Find and focus the search input on the current page (if it exists)
    const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  private closeOpenModals(): void {
    // Close any open dropdowns by clicking elsewhere
    // This is a simple implementation; more complex modals may need explicit handling
    const closeButtons = document.querySelectorAll('[aria-label*="close"], [aria-label*="Close"]');
    closeButtons.forEach((btn) => {
      (btn as HTMLElement).click();
    });
  }
}
