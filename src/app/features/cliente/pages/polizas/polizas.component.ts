import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
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
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly detalleId = this.route.snapshot.paramMap.get('polizaId');

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly polizas = signal<Poliza[]>([]);
  readonly seleccionada = signal<Poliza | null>(null);
  private readonly etiquetasHistorial: Record<string, string> = {
    FIRMA_CAPTURADA: 'Firma capturada',
    VALIDACION_FIRMA: 'Firma validada',
    VALIDACION_PAGO: 'Pago validado',
    FIRMA_VINCULADA: 'Firma vinculada',
    POLIZA_EMITIDA: 'Póliza emitida',
  };

  async ngOnInit(): Promise<void> {
    try {
      const polizas = await this.servicio.listarMisPolizas();
      this.polizas.set(polizas);
      if (this.detalleId) {
        this.seleccionada.set(
          polizas.find((poliza) => poliza.poliza_id === this.detalleId) ?? null,
        );
      }
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionar(poliza: Poliza): void {
    void this.router.navigate(['/cliente/polizas', poliza.poliza_id]);
  }

  get correoCliente(): string {
    return this.auth.email ?? 'Cliente asegurado';
  }

  coberturaMaxima(poliza: Poliza): string {
    return this.formatearNumero(
      Math.max(...poliza.coberturas.map((cobertura) => Number(cobertura.limite_asegurado)), 0),
    );
  }

  deducible(poliza: Poliza): string {
    return this.formatearNumero(Number(poliza.coberturas[0]?.deducible ?? 0));
  }

  etiquetaHistorial(tipo: string): string {
    return this.etiquetasHistorial[tipo] ?? tipo;
  }

  private formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(valor);
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 503) {
      return 'El servicio de pólizas no está disponible. Intenta de nuevo.';
    }
    return 'No pudimos cargar tus pólizas. Intenta de nuevo.';
  }
}
