import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-socio',
  template: `
    <main class="socio-portal">
      <p class="socio-portal__eyebrow">Solventa · Socios</p>
      <h1>Portal del socio</h1>
      <p>Tu cuenta está activa. Desde aquí podrás consultar tus productos y operaciones.</p>
      <p class="socio-portal__email">{{ correo }}</p>
      <button type="button" (click)="cerrarSesion()">Cerrar sesión</button>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocioComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected get correo(): string {
    return this.auth.email ?? '';
  }

  protected async cerrarSesion(): Promise<void> {
    this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
