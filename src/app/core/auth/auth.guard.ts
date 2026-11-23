import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.authenticated() ? true : inject(Router).createUrlTree(['/login']);
};

export const sociosAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.authenticated()) return inject(Router).createUrlTree(['/login']);
  return auth.hasGroup('SociosAdmin') ? true : inject(Router).createUrlTree(['/cliente']);
};
