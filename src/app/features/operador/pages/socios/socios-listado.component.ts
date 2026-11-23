import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiKeyCreada, SocioRegistrado } from '../../../../core/models/socio';
import { SocioService } from '../../../../core/services/socio.service';

@Component({
  selector: 'app-socios-listado',
  styleUrl: './socios-listado.component.scss',
  templateUrl: './socios-listado.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SociosListadoComponent implements OnInit {
  private readonly servicio = inject(SocioService);

  protected readonly socios = signal<SocioRegistrado[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly generandoPara = signal<string | null>(null);
  protected readonly credencialCreada = signal<ApiKeyCreada | null>(null);
  protected readonly errorCredencial = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(false);
    try {
      this.socios.set(await firstValueFrom(this.servicio.listar()));
    } catch {
      this.error.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  protected async generarCredencial(socio: SocioRegistrado): Promise<void> {
    if (socio.estado !== 'ACTIVO' || this.generandoPara()) return;
    this.generandoPara.set(socio.id);
    this.credencialCreada.set(null);
    this.errorCredencial.set(null);
    try {
      this.credencialCreada.set(await firstValueFrom(this.servicio.generarApiKey(socio.id)));
    } catch {
      this.errorCredencial.set('No pudimos generar las credenciales. Intenta de nuevo.');
    } finally {
      this.generandoPara.set(null);
    }
  }

  protected cerrarCredencial(): void {
    this.credencialCreada.set(null);
  }
}
