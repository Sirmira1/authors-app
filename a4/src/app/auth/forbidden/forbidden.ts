import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="forbidden-shell">
      <h2>Access restricted</h2>
      <p>
        You do not have permission to view this page.
        Employees and Jobs are restricted to management roles.
        Sales is restricted to CFO, Sales Representative, Business Operations Manager, and Marketing Manager roles.
        @if (auth.user(); as u) {
          You are signed in as <strong>{{ u.name }}</strong> ({{ u.job_desc }}),
          which does not have access to this section.
        }
      </p>
      <a routerLink="/authors" class="forbidden-link">Back to Authors</a>
    </div>
  `,
  styles: [
    `
      .forbidden-shell {
        max-width: 560px;
        margin: 2.5rem auto;
        padding: 2rem;
        text-align: center;
        background: #fff;
        border: 1px solid #c9d4dd;
        border-radius: 12px;
      }
      .forbidden-shell h2 {
        color: #8a2b2b;
        margin-top: 0;
      }
      .forbidden-link {
        display: inline-block;
        margin-top: 1rem;
        padding: 0.55rem 1.1rem;
        border-radius: 999px;
        background: #2179b7;
        color: #fff;
        text-decoration: none;
        font-weight: 700;
      }
    `,
  ],
})
export class ForbiddenComponent {
  readonly auth = inject(AuthService);
}
