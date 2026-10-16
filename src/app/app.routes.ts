import { Routes } from '@angular/router';
import { RegistroComponent } from './features/onboarding/pages/registro/registro.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Entra a tu cuenta · Solventa',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  { path: 'registro', component: RegistroComponent },
  { path: '**', redirectTo: 'login' },
];
