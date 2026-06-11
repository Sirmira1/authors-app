import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeaderComponent } from './layout/site-header/site-header';
import { SiteFooterComponent } from './layout/site-footer/site-footer';

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
}
