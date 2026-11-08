import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Poliza } from '../../../../core/models/cotizacion';
import { PolizaService } from '../../../../core/services/poliza.service';

@Component({
  selector: 'app-polizas',
  imports: [DatePipe, DecimalPipe],
  styleUrl: './polizas.component.scss',
  templateUrl: './polizas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolizasComponent implements OnInit {
  private readonly servicio = inject(PolizaService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly polizas = signal<Poliza[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      this.polizas.set(await this.servicio.listarMisPolizas());
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 503) {
      return 'El servicio de pólizas no está disponible. Intenta de nuevo.';
    }
    return 'No pudimos cargar tus pólizas. Intenta de nuevo.';
  }
}
