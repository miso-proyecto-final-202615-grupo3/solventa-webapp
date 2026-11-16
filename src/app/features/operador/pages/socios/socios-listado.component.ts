import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SocioRegistrado } from '../../../../core/models/socio';
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
}
