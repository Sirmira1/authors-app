import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, NgIf],
  template: `
    <header class="gov-header" role="banner">
      <div class="gov-header__bar">
        <div class="gov-header__brand-wrap">
          <div class="gov-header__logo-badge">
            <img
              *ngIf="!logoFailed"
              class="gov-header__logo"
              [src]="logoPath"
              alt="Government of Ontario"
              (error)="onLogoError()"
            />
            <span *ngIf="logoFailed" class="gov-header__logo-fallback">Government of Ontario</span>
          </div>
          <div class="gov-header__meta">
            <p class="gov-header__kicker">Government of Ontario</p>
            <h1 class="gov-header__title">Author Management Portal</h1>
          </div>
        </div>
      </div>

      <div class="gov-header__nav-wrap">
        <nav class="gov-nav" aria-label="Primary">
          <a routerLink="/authors">Authors Directory</a>
          <a routerLink="/authors/new">Register Author</a>
        </nav>
      </div>
    </header>
  `,
  styles: [
    `
      .gov-header__bar {
        background: #333;
        border-bottom: 6px solid #097a0a;
      }

      .gov-header__brand-wrap {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.25rem;
      }

      .gov-header__logo-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        min-height: 62px;
        min-width: 230px;
        padding: 0.35rem 0.75rem;
        border-radius: 6px;
        background: #000;
        border: 1px solid rgba(255, 255, 255, 0.25);
      }

      .gov-header__logo {
        width: 140px;
        max-width: 42vw;
        height: auto;
        display: block;
      }

      .gov-header__logo-wordmark {
        color: #fff;
        font-size: 1.05rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        line-height: 1;
      }

      .gov-header__logo-fallback {
        color: #fff;
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 0.01em;
      }

      .gov-header__meta {
        color: #fff;
      }

      .gov-header__kicker {
        margin: 0;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.9;
      }

      .gov-header__title {
        margin: 0.2rem 0 0;
        font-size: 1.45rem;
        line-height: 1.2;
      }

      .gov-header__nav-wrap {
        background: #fff;
        border-bottom: 1px solid #c9d4dd;
      }

      .gov-nav {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0.65rem 1.25rem;
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .gov-nav a {
        display: inline-flex;
        align-items: center;
        min-height: 40px;
        padding: 0 0.9rem;
        border-radius: 999px;
        border: 1px solid #2179b7;
        color: #2179b7;
        font-weight: 700;
        text-decoration: none;
      }

      .gov-nav a:hover {
        background: #e8f2f9;
      }

      @media (max-width: 640px) {
        .gov-header__brand-wrap {
          align-items: flex-start;
          flex-direction: column;
        }

        .gov-header__logo {
          width: 118px;
        }

        .gov-header__logo-wordmark {
          font-size: 0.95rem;
        }

        .gov-header__title {
          font-size: 1.2rem;
        }
      }
    `,
  ],
})
export class SiteHeaderComponent {
  logoPath = '/ontario-logo.svg';
  logoFailed = false;

  onLogoError(): void {
    this.logoFailed = true;
  }
}
