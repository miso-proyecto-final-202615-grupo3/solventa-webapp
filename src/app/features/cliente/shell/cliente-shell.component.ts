import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

interface ItemMenu {
  etiqueta: string;
  ruta: string | null;
}

interface Encabezado {
  kicker: string;
  titulo: string;
}

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-cliente-shell',
  styleUrl: './cliente-shell.component.scss',
  templateUrl: './cliente-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Secciones del portal cliente; las que no tienen ruta aún no existen en el producto. */
  protected readonly menu: readonly ItemMenu[] = [
    { etiqueta: 'Mis pólizas', ruta: '/cliente/polizas' },
    { etiqueta: 'Siniestros', ruta: null },
    { etiqueta: 'Adquirir', ruta: '/cliente/adquirir' },
    { etiqueta: 'Perfil', ruta: '/cliente/perfil' },
  ];

  /** Kicker y título de la barra superior, tomados del `data` de la ruta activa. */
  protected readonly encabezado = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.leerEncabezado()),
    ),
    { initialValue: this.leerEncabezado() },
  );

  protected get correo(): string {
    return this.auth.email ?? '';
  }

  protected async cerrarSesion(): Promise<void> {
    this.auth.logout();
    await this.router.navigateByUrl('/login');
  }

  private leerEncabezado(): Encabezado {
    let ruta = this.router.routerState.snapshot.root;
    while (ruta.firstChild) {
      ruta = ruta.firstChild;
    }
    return {
      kicker: (ruta.data['kicker'] as string | undefined) ?? '',
      titulo: (ruta.data['titulo'] as string | undefined) ?? '',
    };
  }
}
