import { Component } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  template: `
    <footer class="gov-footer" role="contentinfo">
      <div class="gov-footer__inner">
        <p>Government of Ontario Services</p>
        <p>Author Management Portal</p>
      </div>
    </footer>
  `,
  styles: [
    `
      .gov-footer {
        margin-top: 2rem;
        border-top: 4px solid var(--on-green);
        background: var(--on-charcoal);
        color: var(--on-white);
      }

      .gov-footer__inner {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem 1.25rem;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.5rem 1rem;
      }

      .gov-footer__inner p {
        margin: 0;
        font-size: 0.92rem;
      }
    `,
  ],
})
export class SiteFooterComponent {}
