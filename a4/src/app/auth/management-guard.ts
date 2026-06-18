import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

/**
 * Route guard for the sensitive Employees and Jobs sections.
 *  - On the server (SSR/prerender) it allows through, because there is no
 *    browser session there; the backend still enforces real security.
 *  - In the browser:
 *      not logged in   -> redirect to /login (remembering where you wanted to go)
 *      logged in, not management -> redirect to /forbidden
 *      management      -> allow.
 */
export const managementGuard: CanActivateFn = (_route, state) => {
  const platformId = inject(PLATFORM_ID);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (!auth.isManagement()) {
    return router.createUrlTree(['/forbidden']);
  }

  return true;
};
