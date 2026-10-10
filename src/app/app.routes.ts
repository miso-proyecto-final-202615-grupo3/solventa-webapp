import { Routes } from '@angular/router';
import { HomeComponent } from './features/cliente/pages/home/home.component';
import { RegistroComponent } from './features/onboarding/pages/registro/registro.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'registro', component: RegistroComponent },
  { path: '**', redirectTo: '' },
];
