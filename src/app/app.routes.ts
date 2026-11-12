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
        path: 'polizas/:polizaId',
        title: 'Detalle de póliza · Solventa',
        data: { kicker: 'cartera', titulo: 'Detalle de póliza' },
        loadComponent: () =>
          import('./features/cliente/pages/polizas/polizas.component').then(
            (m) => m.PolizasComponent,
          ),
      },
      {
        path: 'adquirir',
        title: 'Adquirir · Solventa',
        data: { kicker: 'adquirir', titulo: 'Catálogo' },
        loadComponent: () =>
          import('./features/cliente/pages/adquirir/catalogo/catalogo.component').then(
            (m) => m.CatalogoComponent,
          ),
      },
      {
        path: 'adquirir/:codigo/cotizar',
        title: 'Cotizar · Solventa',
        data: { kicker: 'adquirir', titulo: 'Cotización' },
        loadComponent: () =>
          import('./features/cliente/pages/adquirir/cotizar/cotizar.component').then(
            (m) => m.CotizarComponent,
          ),
      },
      {
        path: 'adquirir/:codigo/cotizacion',
        title: 'Resultado de la cotización · Solventa',
        data: { kicker: 'adquirir', titulo: 'Resultado' },
        loadComponent: () =>
          import('./features/cliente/pages/adquirir/cotizacion/cotizacion.component').then(
            (m) => m.CotizacionComponent,
          ),
      },
      {
        path: 'adquirir/:codigo/condiciones',
        title: 'Condiciones de la póliza · Solventa',
        data: { kicker: 'adquirir', titulo: 'Condiciones' },
        loadComponent: () =>
          import('./features/cliente/pages/adquirir/condiciones/condiciones.component').then(
            (m) => m.CondicionesComponent,
          ),
      },
      {
        path: 'adquirir/:codigo/identidad',
        title: 'Verificación de identidad · Solventa',
        data: { kicker: 'adquirir', titulo: 'Identidad' },
        loadComponent: () =>
          import('./features/cliente/pages/adquirir/identidad/identidad.component').then(
            (m) => m.IdentidadComponent,
          ),
      },
      {
        path: 'adquirir/:codigo/pago',
        title: 'Pago · Solventa',
        data: { kicker: 'adquirir', titulo: 'Pago' },
        loadComponent: () =>
          import('./features/cliente/pages/adquirir/pago/pago.component').then(
            (m) => m.PagoComponent,
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
