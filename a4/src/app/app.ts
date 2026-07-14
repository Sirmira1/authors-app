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
    <a class="skip-link" href="#main-content">Skip to main content</a>

    <app-site-header />

    <main class="gov-main" id="main-content" tabindex="-1">
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

      .gov-main:focus {
        outline: none;
      }

      .skip-link {
        position: absolute;
        left: 0.5rem;
        top: -3rem;
        z-index: 1000;
        padding: 0.6rem 1rem;
        background: #097a0a;
        color: #fff;
        font-weight: 700;
        border-radius: 0 0 8px 8px;
        text-decoration: none;
        transition: top 0.15s ease;
      }

      .skip-link:focus {
        top: 0;
        outline: 3px solid #ffbf47;
        outline-offset: 2px;
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
