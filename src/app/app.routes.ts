import { Routes } from '@angular/router';
import { authGuard, sociosAdminGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Entra a tu cuenta · Solventa',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'recuperar',
    title: 'Recupera tu cuenta · Solventa',
    loadComponent: () =>
      import('./features/auth/recuperar/recuperar.component').then(
        (m) => m.RecuperarClaveComponent,
      ),
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
        path: 'adquirir/:codigo/firma',
        title: 'Firma digital · Solventa',
        data: { kicker: 'adquirir', titulo: 'Firma' },
        loadComponent: () =>
          import('./features/cliente/pages/adquirir/firma/firma.component').then(
            (m) => m.FirmaComponent,
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
        path: 'adquirir/:codigo/confirmacion',
        title: 'Póliza emitida · Solventa',
        data: { kicker: 'adquirir', titulo: 'Confirmación' },
        loadComponent: () =>
          import('./features/cliente/pages/adquirir/confirmacion/confirmacion.component').then(
            (m) => m.ConfirmacionComponent,
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
    path: 'operador',
    canActivate: [sociosAdminGuard],
    loadComponent: () =>
      import('./features/cliente/shell/cliente-shell.component').then(
        (m) => m.ClienteShellComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'socios' },
      {
        path: 'socios',
        title: 'Socios registrados · Solventa',
        data: { kicker: 'backoffice', titulo: 'Socios registrados' },
        loadComponent: () =>
          import('./features/operador/pages/socios/socios-listado.component').then(
            (m) => m.SociosListadoComponent,
          ),
      },
      {
        path: 'socios/nuevo',
        title: 'Registrar socio · Solventa',
        data: { kicker: 'backoffice', titulo: 'Registrar socio' },
        loadComponent: () =>
          import('./features/operador/pages/socios/socios.component').then(
            (m) => m.SociosComponent,
          ),
      },
    ],
  },
  {
    path: 'operador/socios',
    title: 'Socios registrados · Solventa',
    canActivate: [sociosAdminGuard],
    loadComponent: () =>
      import('./features/operador/pages/socios/socios.component').then((m) => m.SociosComponent),
  },
  {
    path: 'operador/socios/nuevo',
    title: 'Registrar socio · Solventa',
    canActivate: [sociosAdminGuard],
    loadComponent: () =>
      import('./features/operador/pages/socios/socios.component').then((m) => m.SociosComponent),
  },
  {
    path: 'socio',
    title: 'Portal del socio · Solventa',
    canActivate: [authGuard],
    loadComponent: () => import('./features/socio/socio.component').then((m) => m.SocioComponent),
  },
  {
    path: 'operador/auditoria-emision',
    title: 'Trazabilidad de emisión · Solventa',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/operador/pages/auditoria-emision/auditoria-emision.component').then(
        (m) => m.AuditoriaEmisionComponent,
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
