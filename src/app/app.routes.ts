import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Entra a tu cuenta · Solventa',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    title: 'Regístrate · Solventa',
    loadComponent: () =>
      import('./features/onboarding/pages/registro/registro.component').then(
        (m) => m.RegistroComponent,
      ),
  },
  {
    path: 'terminos',
    title: 'Consentimiento de uso de datos · Solventa',
    loadComponent: () =>
      import('./features/onboarding/pages/terminos/terminos.component').then(
        (m) => m.TerminosComponent,
      ),
  },
  {
    path: 'operador/auditoria-consentimiento',
    title: 'Auditoría de consentimientos · Solventa',
    loadComponent: () =>
      import('./features/operador/pages/auditoria-consentimiento/auditoria-consentimiento.component').then(
        (m) => m.AuditoriaConsentimientoComponent,
      ),
  },
  { path: '**', redirectTo: 'login' },
];
