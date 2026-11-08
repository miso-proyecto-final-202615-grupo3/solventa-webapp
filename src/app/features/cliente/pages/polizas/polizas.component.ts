import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Poliza } from '../../../../core/models/cotizacion';
import { PolizaService } from '../../../../core/services/poliza.service';

@Component({
  selector: 'app-polizas',
  imports: [DatePipe, DecimalPipe, RouterLink],
  styleUrl: './polizas.component.scss',
  templateUrl: './polizas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolizasComponent implements OnInit {
  private readonly servicio = inject(PolizaService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly polizas = signal<Poliza[]>([]);
  readonly seleccionada = signal<Poliza | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const polizas = await this.servicio.listarMisPolizas();
      this.polizas.set(polizas);
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionar(poliza: Poliza): void {
    this.seleccionada.set(poliza);
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 503) {
      return 'El servicio de pólizas no está disponible. Intenta de nuevo.';
    }
    return 'No pudimos cargar tus pólizas. Intenta de nuevo.';
  }
}
