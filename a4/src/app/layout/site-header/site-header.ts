import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth';

interface NavLink {
  label: string;
  link: string;
}

interface NavMenu {
  label: string;
  basePath: string;
  links: NavLink[];
  /** When true, only management employees may see this menu. */
  managementOnly?: boolean;
}

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, NgIf, NgFor],
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
            <h1 class="gov-header__title">Pubs Management Portal</h1>
          </div>
        </div>
      </div>

      <div class="gov-header__nav-wrap">
        <nav class="gov-nav" aria-label="Primary">
          <div class="gov-nav__menu" *ngFor="let menu of visibleMenus">
            <button
              type="button"
              class="gov-nav__trigger"
              [class.open]="openMenu === menu.label"
              [class.active]="isMenuActive(menu.basePath)"
              [attr.aria-expanded]="openMenu === menu.label"
              (click)="toggleMenu(menu.label, $event)"
            >
              {{ menu.label }}
              <span class="gov-nav__caret" aria-hidden="true">▾</span>
            </button>
            <ul class="gov-nav__dropdown" *ngIf="openMenu === menu.label" role="menu">
              <li *ngFor="let item of menu.links" role="none">
                <a role="menuitem" [routerLink]="item.link" (click)="closeMenu()">{{ item.label }}</a>
              </li>
            </ul>
          </div>

          <div class="gov-nav__auth">
            <ng-container *ngIf="isLoggedIn; else signedOut">
              <span class="gov-nav__user" title="Signed in">{{ currentUserName }}</span>
              <button type="button" class="gov-nav__auth-btn" (click)="logout()">Sign Out</button>
            </ng-container>
            <ng-template #signedOut>
              <a class="gov-nav__auth-btn" routerLink="/login" (click)="closeMenu()">Sign In</a>
            </ng-template>
          </div>
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
        max-width: 1500px;
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
        max-width: 1500px;
        margin: 0 auto;
        padding: 0.65rem 1.25rem;
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .gov-nav__menu {
        position: relative;
      }

      .gov-nav__auth {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
      }

      .gov-nav__user {
        font-weight: 700;
        color: #1f3b54;
        font-size: 0.95rem;
      }

      .gov-nav__auth-btn {
        display: inline-flex;
        align-items: center;
        min-height: 40px;
        padding: 0 0.9rem;
        border-radius: 999px;
        border: 1px solid #097a0a;
        background: #097a0a;
        color: #fff;
        font-weight: 700;
        font-size: 0.95rem;
        text-decoration: none;
        cursor: pointer;
      }

      .gov-nav__auth-btn:hover {
        background: #0a6b0b;
      }

      .gov-nav__trigger {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        min-height: 40px;
        padding: 0 0.9rem;
        border-radius: 999px;
        border: 1px solid #2179b7;
        background: #fff;
        color: #2179b7;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
      }

      .gov-nav__trigger:hover,
      .gov-nav__trigger.open,
      .gov-nav__trigger.active {
        background: #e8f2f9;
      }

      .gov-nav__caret {
        font-size: 0.7rem;
      }

      .gov-nav__dropdown {
        position: absolute;
        z-index: 30;
        top: calc(100% + 4px);
        left: 0;
        min-width: 200px;
        margin: 0;
        padding: 0.35rem;
        list-style: none;
        background: #fff;
        border: 1px solid #c9d4dd;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      .gov-nav__dropdown a {
        display: block;
        padding: 0.55rem 0.75rem;
        border-radius: 6px;
        color: #1f3b54;
        font-weight: 600;
        text-decoration: none;
        white-space: nowrap;
      }

      .gov-nav__dropdown a:hover {
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
  openMenu: string | null = null;

  readonly menus: NavMenu[] = [
    {
      label: 'Authors',
      basePath: '/authors',
      links: [
        { label: 'Authors Directory', link: '/authors' },
        { label: 'Register Author', link: '/authors/new' },
      ],
    },
    {
      label: 'Publishers',
      basePath: '/publishers',
      links: [
        { label: 'Publishers Directory', link: '/publishers' },
        { label: 'Register Publisher', link: '/publishers/new' },
      ],
    },
    {
      label: 'Jobs',
      basePath: '/jobs',
      managementOnly: true,
      links: [
        { label: 'Jobs Directory', link: '/jobs' },
        { label: 'Register Job', link: '/jobs/new' },
      ],
    },
    {
      label: 'Titles',
      basePath: '/titles',
      links: [
        { label: 'Titles Directory', link: '/titles' },
        { label: 'Register Title', link: '/titles/new' },
      ],
    },
    {
      label: 'Employees',
      basePath: '/employees',
      managementOnly: true,
      links: [
        { label: 'Employees Directory', link: '/employees' },
        { label: 'Register Employee', link: '/employees/new' },
      ],
    },
    {
      label: 'Sales',
      basePath: '/sales',
      links: [
        { label: 'Sales Directory', link: '/sales' },
        { label: 'Register Sale', link: '/sales/new' },
      ],
    },
  ];

  constructor(private elementRef: ElementRef<HTMLElement>, private router: Router) {}

  private readonly auth = inject(AuthService);

  /** Menus the current user is allowed to see (hides management-only when not management). */
  get visibleMenus(): NavMenu[] {
    const isManagement = this.auth.isManagement();
    return this.menus.filter((menu) => !menu.managementOnly || isManagement);
  }

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  get currentUserName(): string | null {
    return this.auth.user()?.name ?? null;
  }

  logout(): void {
    this.auth.logout();
    this.closeMenu();
    this.router.navigate(['/login']);
  }

  onLogoError(): void {
    this.logoFailed = true;
  }

  isMenuActive(basePath: string): boolean {
    const currentUrl = this.router.url.split('?')[0];
    return currentUrl === basePath || currentUrl.startsWith(basePath + '/');
  }

  toggleMenu(label: string, event: Event): void {
    event.stopPropagation();
    this.openMenu = this.openMenu === label ? null : label;
  }

  closeMenu(): void {
    this.openMenu = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }
}
