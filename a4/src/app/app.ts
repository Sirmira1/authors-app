import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeaderComponent } from './layout/site-header/site-header';
import { SiteFooterComponent } from './layout/site-footer/site-footer';
import { ThemeService } from './shared/theme.service';
import { KeyboardShortcutsService } from './shared/keyboard-shortcuts.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  template: `
    <app-site-header />

    <main class="gov-main" id="main-content">
      <router-outlet />
    </main>

    <app-site-footer />
  `,
  styles: [
    `
      .gov-main {
        max-width: 1500px;
        margin: 0 auto;
        padding: 1rem;
      }
    `,
  ],
})
export class App {
  title = signal('pubs-authors-app');

  // Inject services to initialize them on app startup
  private readonly themeService = inject(ThemeService);
  private readonly keyboardShortcuts = inject(KeyboardShortcutsService);
}
