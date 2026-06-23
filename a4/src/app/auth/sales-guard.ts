import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

/**
 * Route guard for the sensitive Sales section.
 * Allowed roles: CFO, Sales Representative, Business Operations Manager,
 * and Marketing Manager.
 */
export const salesGuard: CanActivateFn = (_route, state) => {
  const platformId = inject(PLATFORM_ID);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (!auth.canAccessSales()) {
    return router.createUrlTree(['/forbidden']);
  }

  return true;
};
