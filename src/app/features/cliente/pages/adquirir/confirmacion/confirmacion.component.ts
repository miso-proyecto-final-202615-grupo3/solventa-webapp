import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCertificado, ResumenPoliza } from '../../../../../core/models/adquisicion';
import { AdquisicionService } from '../../../../../core/services/adquisicion.service';
import { CotizacionService } from '../../../../../core/services/cotizacion.service';
import { formatearMonto } from '../../../../../core/utils/parametros';
import { consultaActiva, sondear } from '../../../../../core/utils/sondeo';
import { EsperaComponent } from '../../../../../shared/espera/espera.component';
import { PasosCompraComponent } from '../../../../../shared/pasos-compra/pasos-compra.component';

@Component({
  imports: [DatePipe, RouterLink, PasosCompraComponent, EsperaComponent],
  selector: 'app-confirmacion',
  styleUrls: ['../adquirir.scss', '../detalles.scss', './confirmacion.component.scss'],
  templateUrl: './confirmacion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmacionComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(AdquisicionService);
  private readonly cancelacion = new AbortController();
  protected readonly cotizacion = inject(CotizacionService).ultima;
  protected readonly poliza = signal<ResumenPoliza | null>(null);
  protected readonly certificado = signal<EstadoCertificado | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly descargando = signal(false);
  protected readonly lista = signal(false);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const c = this.cotizacion();
    if (!c) {
      await this.router.navigateByUrl('/cliente/adquirir');
      return;
    }
    const intento = this.api.intento(c.cotizacion_id);
    if (intento?.pago?.estado !== 'APROBADO' || !intento.confirmado) {
      await this.router.navigate(['/cliente/adquirir', c.producto_codigo, 'pago']);
      return;
    }
    await this.consultar();
  }

  ngOnDestroy(): void {
    this.cancelacion.abort();
  }

  protected async consultar(): Promise<void> {
    const c = this.cotizacion();
    if (!c || this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set(null);
    try {
      const resultado = await sondear(
        async () => {
          let poliza: ResumenPoliza;
          try {
            poliza = await consultaActiva(
              this.api.poliza(c.cotizacion_id, c.cliente_id),
              this.cancelacion.signal,
            );
          } catch (err) {
            if (err instanceof HttpErrorResponse && err.status === 404) return false;
            throw err;
          }
          this.poliza.set(poliza);
          let certificado: EstadoCertificado;
          try {
            certificado = await consultaActiva(
              this.api.certificado(poliza.poliza_id, c.cliente_id),
              this.cancelacion.signal,
            );
          } catch (err) {
            if (err instanceof HttpErrorResponse && err.status === 404) return false;
            throw err;
          }
          this.certificado.set(certificado);
          if (certificado.ultima_generacion?.estado === 'FALLIDO') {
            throw new Error('Falló la generación del certificado.');
          }
          return (
            poliza.estado.toUpperCase() === 'EMITIDA' &&
            certificado.estado_certificado === 'GENERADO' &&
            certificado.disponible
          );
        },
        (completado) => completado,
        this.cancelacion.signal,
      );
      if (resultado) {
        this.lista.set(true);
      } else if (!this.cancelacion.signal.aborted) {
        this.error.set(
          'La emisión o el certificado siguen en proceso. Consulta de nuevo en unos instantes.',
        );
      }
    } catch (err) {
      if (!this.cancelacion.signal.aborted) {
        this.error.set(
          err instanceof Error && err.message === 'Falló la generación del certificado.'
            ? 'Falló la generación del certificado. Consulta de nuevo o contacta a soporte.'
            : 'No pudimos consultar la emisión o el certificado. Intenta de nuevo.',
        );
      }
    } finally {
      if (!this.cancelacion.signal.aborted) this.ocupado.set(false);
    }
  }

  protected estadoEmision(): string {
    return this.poliza()?.estado ?? 'PENDIENTE';
  }

  protected estadoCertificado(): string {
    const estado = this.certificado();
    if (estado?.ultima_generacion?.estado === 'FALLIDO') return 'FALLIDO';
    if (estado?.estado_certificado === 'GENERADO' && !estado.disponible) {
      return 'GENERADO, no disponible';
    }
    return estado?.estado_certificado ?? 'PENDIENTE';
  }

  protected monto(poliza: ResumenPoliza): string {
    return formatearMonto(poliza.prima, poliza.moneda ?? this.cotizacion()?.moneda ?? '');
  }

  protected async descargar(): Promise<void> {
    const c = this.cotizacion();
    const poliza = this.poliza();
    if (!c || !poliza || !this.lista() || this.descargando()) return;
    this.descargando.set(true);
    this.error.set(null);
    try {
      const archivo = await consultaActiva(
        this.api.descargarCertificado(poliza.poliza_id, c.cliente_id),
        this.cancelacion.signal,
      );
      if (
        archivo.size === 0 ||
        archivo.type.split(';')[0].trim().toLowerCase() !== 'application/pdf'
      ) {
        throw new Error('El certificado recibido no es un PDF válido.');
      }
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `certificado-${poliza.poliza_id}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      if (!this.cancelacion.signal.aborted)
        this.error.set('No pudimos descargar el certificado. Intenta de nuevo.');
    } finally {
      if (!this.cancelacion.signal.aborted) this.descargando.set(false);
    }
  }
}
