import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Entra a tu cuenta · Solventa',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'cliente',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cliente/shell/cliente-shell.component').then(
        (m) => m.ClienteShellComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'polizas' },
      {
        path: 'polizas',
        title: 'Pólizas · Solventa',
        data: { kicker: 'cartera', titulo: 'Mis pólizas' },
        loadComponent: () =>
          import('./features/cliente/pages/polizas/polizas.component').then(
            (m) => m.PolizasComponent,
          ),
      },
      {
        path: 'perfil',
        title: 'Perfil · Solventa',
        data: { kicker: 'perfil', titulo: 'Tratamiento de datos' },
        loadComponent: () =>
          import('./features/cliente/pages/perfil/perfil.component').then((m) => m.PerfilComponent),
      },
    ],
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
