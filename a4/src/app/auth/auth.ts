import { Injectable, signal, computed, inject, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

/** The signed-in user, as returned by the backend login endpoint. */
export interface AuthUser {
  emp_id: string;
  name: string;
  job_id: number;
  job_desc: string | null;
  isManagement: boolean;
  isSalesAccess?: boolean;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'pubs-auth-token';
const USER_KEY = 'pubs-auth-user';
const SALES_ACCESS_JOB_IDS = new Set([3, 4, 7, 13]);

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:5232/api/auth';
  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // The current user as a signal so templates/guards react automatically.
  // Initialised from localStorage so a page refresh keeps you logged in.
  private readonly userSignal = signal<AuthUser | null>(this.readStoredUser());

  /** Read-only view of the current user. */
  readonly user = this.userSignal.asReadonly();
  /** True when someone is logged in. */
  readonly isLoggedIn = computed(() => this.userSignal() !== null);
  /** True only for management employees (used to show/guard sensitive pages). */
  readonly isManagement = computed(() => this.userSignal()?.isManagement === true);
  /** True only for roles allowed to access the Sales section. */
  readonly canAccessSales = computed(() => {
    const user = this.userSignal();
    if (!user) {
      return false;
    }

    // Fallback to job_id so existing cached sessions still work even when the
    // backend has not yet started returning isSalesAccess.
    return user.isSalesAccess === true || SALES_ACCESS_JOB_IDS.has(user.job_id);
  });

  /** The raw JWT to attach to API requests (null when logged out). */
  get token(): string | null {
    return this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
  }

  /** POST credentials to the backend; on success store token + user. */
  login(empId: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, { emp_id: empId, password })
      .pipe(
        tap((res) => {
          // HTTP callbacks run outside Angular's zone with withFetch(), so wrap
          // state changes in ngZone.run() to trigger change detection.
          this.ngZone.run(() => {
            if (this.isBrowser) {
              localStorage.setItem(TOKEN_KEY, res.token);
              localStorage.setItem(USER_KEY, JSON.stringify(res.user));
            }
            this.userSignal.set(res.user);
          });
        })
      );
  }

  /** Clear all auth state. */
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    this.userSignal.set(null);
  }

  private readStoredUser(): AuthUser | null {
    if (!this.isBrowser) {
      return null;
    }
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
