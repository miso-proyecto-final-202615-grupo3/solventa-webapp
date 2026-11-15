import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../../core/auth/auth.service';
import {
  FirmaDigital,
  MetodoPago,
  Pago,
  ResumenPago,
  SolicitudPago,
} from '../../../../../core/models/adquisicion';
import { AdquisicionService } from '../../../../../core/services/adquisicion.service';
import { CotizacionService } from '../../../../../core/services/cotizacion.service';
import { formatearMonto } from '../../../../../core/utils/parametros';
import { consultaActiva, sondear } from '../../../../../core/utils/sondeo';
import { EsperaComponent } from '../../../../../shared/espera/espera.component';
import { PasosCompraComponent } from '../../../../../shared/pasos-compra/pasos-compra.component';
import { FormatoTarjetaDirective } from './formato-tarjeta.directive';

@Component({
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PasosCompraComponent,
    EsperaComponent,
    FormatoTarjetaDirective,
  ],
  selector: 'app-pago',
  styleUrls: ['../adquirir.scss', './pago.component.scss'],
  templateUrl: './pago.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagoComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(AdquisicionService);
  private readonly auth = inject(AuthService);
  private readonly cancelacion = new AbortController();
  private solicitudPendiente: SolicitudPago | null = null;
  protected readonly cotizacion = inject(CotizacionService).ultima;
  protected readonly resumen = signal<ResumenPago | null>(null);
  protected readonly cargando = signal(true);
  protected readonly ocupado = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pago = signal<Pago | null>(null);
  protected readonly aprobado = signal(false);
  protected readonly incierto = signal(false);
  protected readonly puedeReenviar = signal(false);
  protected readonly form = new FormGroup({
    metodo: new FormControl<MetodoPago>('PAYPAL', { nonNullable: true }),
    email: new FormControl(this.auth.email ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254)],
    }),
    numero: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]{13,19}$/)],
    }),
    vencimiento: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\d{2}$/)],
    }),
    cvv: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]{3}$/)],
    }),
  });

  async ngOnInit(): Promise<void> {
    const c = this.cotizacion();
    if (!c) {
      await this.router.navigateByUrl('/cliente/adquirir');
      return;
    }
    this.cambiarMetodo();
    await this.cargar();
  }

  ngOnDestroy(): void {
    this.cancelacion.abort();
  }

  protected async cargar(): Promise<void> {
    const c = this.cotizacion();
    if (!c) return;
    this.cargando.set(true);
    this.error.set(null);
    try {
      let firma: FirmaDigital;
      try {
        firma = await consultaActiva(
          this.api.consultarFirma(c.cotizacion_id),
          this.cancelacion.signal,
        );
      } catch (err) {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          await this.router.navigate(['/cliente/adquirir', c.producto_codigo, 'firma']);
          return;
        }
        throw err;
      }
      if (firma.estado !== 'CAPTURADA' && firma.estado !== 'VINCULADA') {
        await this.router.navigate(['/cliente/adquirir', c.producto_codigo, 'firma']);
        return;
      }
      const resumen = await consultaActiva(
        this.api.resumenPago(c.cotizacion_id),
        this.cancelacion.signal,
      );
      const metodo = resumen.metodos_pago.find((m) => m.por_defecto) ?? resumen.metodos_pago[0];
      if (!metodo) throw new Error('No hay métodos de pago disponibles');
      this.resumen.set(resumen);
      this.form.controls.metodo.setValue(metodo.codigo);
      this.cambiarMetodo();
      const intento = this.api.intento(c.cotizacion_id);
      if (intento?.pago) {
        this.pago.set(intento.pago);
        this.aprobado.set(intento.pago.estado === 'APROBADO' && intento.confirmado);
        if (
          !intento.confirmado &&
          (intento.pago.estado === 'PENDIENTE' || intento.pago.estado === 'APROBADO')
        ) {
          await this.consultar();
        }
      } else if (intento) {
        this.incierto.set(true);
        this.error.set(
          'No se pudo confirmar el envío anterior. No realices otro pago; contacta a soporte para verificarlo.',
        );
      }
    } catch {
      if (!this.cancelacion.signal.aborted)
        this.error.set(
          'No pudimos cargar el resumen de pago o comprobar la firma. Intenta de nuevo.',
        );
    } finally {
      if (!this.cancelacion.signal.aborted) this.cargando.set(false);
    }
  }

  protected cambiarMetodo(): void {
    const paypal = this.form.controls.metodo.value === 'PAYPAL';
    if (paypal) {
      this.form.controls.email.enable();
      this.form.controls.numero.disable();
      this.form.controls.vencimiento.disable();
      this.form.controls.cvv.disable();
    } else {
      this.form.controls.email.disable();
      this.form.controls.numero.enable();
      this.form.controls.vencimiento.enable();
      this.form.controls.cvv.enable();
    }
  }

  protected monto(resumen: ResumenPago): string {
    return formatearMonto(resumen.prima_total, resumen.moneda);
  }

  protected async pagar(): Promise<void> {
    const c = this.cotizacion();
    if (!c || this.ocupado() || this.api.intento(c.cotizacion_id) || !this.resumen()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const mes = Number(v.vencimiento.slice(0, 2));
    const anio = 2000 + Number(v.vencimiento.slice(2));
    if (v.metodo === 'TARJETA_CREDITO') {
      const hoy = new Date();
      if (anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < hoy.getMonth() + 1)) {
        this.error.set('La tarjeta está vencida. Revisa la fecha de expiración.');
        return;
      }
    }
    this.solicitudPendiente =
      v.metodo === 'PAYPAL'
        ? {
            cotizacion_id: c.cotizacion_id,
            cliente_id: c.cliente_id,
            metodo_pago: v.metodo,
            paypal_email: v.email.trim(),
          }
        : {
            cotizacion_id: c.cotizacion_id,
            cliente_id: c.cliente_id,
            metodo_pago: v.metodo,
            numero_tarjeta: v.numero,
            mes_expiracion: mes,
            anio_expiracion: anio,
            cvv: v.cvv,
          };
    this.api.guardarIntento(c.cotizacion_id, {
      clave: crypto.randomUUID(),
      pago: null,
      confirmado: false,
    });
    await this.enviarIntento();
  }

  protected async enviarIntento(): Promise<void> {
    const c = this.cotizacion();
    const intento = c && this.api.intento(c.cotizacion_id);
    if (!c || !intento || !this.solicitudPendiente || this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set(null);
    try {
      const pago = await consultaActiva(
        this.api.procesarPago(this.solicitudPendiente, intento.clave),
        this.cancelacion.signal,
      );
      this.solicitudPendiente = null;
      this.puedeReenviar.set(false);
      this.form.controls.numero.reset();
      this.form.controls.cvv.reset();
      this.incierto.set(false);
      this.actualizarPago(pago);
      if (pago.estado === 'PENDIENTE' || pago.estado === 'APROBADO') {
        await this.esperarPago(pago.pago_id);
      }
    } catch {
      if (!this.cancelacion.signal.aborted) {
        this.incierto.set(true);
        this.puedeReenviar.set(!!this.solicitudPendiente);
        this.error.set(
          this.solicitudPendiente
            ? 'No se pudo confirmar el envío. Reintenta la misma solicitud; no se creará un nuevo intento de pago.'
            : 'No pudimos consultar el pago. Consulta de nuevo antes de intentar otro pago.',
        );
      }
    } finally {
      if (!this.cancelacion.signal.aborted) this.ocupado.set(false);
    }
  }

  protected async consultar(): Promise<void> {
    const pago = this.pago();
    if (!pago || this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set(null);
    try {
      await this.esperarPago(pago.pago_id);
    } catch {
      if (!this.cancelacion.signal.aborted)
        this.error.set('No pudimos consultar el pago. Intenta de nuevo.');
    } finally {
      if (!this.cancelacion.signal.aborted) this.ocupado.set(false);
    }
  }

  private async esperarPago(pagoId: string): Promise<void> {
    const resultado = await sondear(
      async () => {
        const pago = await consultaActiva(this.api.consultarPago(pagoId), this.cancelacion.signal);
        this.actualizarPago(pago, true);
        return pago;
      },
      (pago) => pago.estado !== 'PENDIENTE',
      this.cancelacion.signal,
    );
    if (!resultado && !this.cancelacion.signal.aborted) {
      this.error.set('El pago sigue en proceso. Consulta de nuevo antes de intentar otro pago.');
    }
  }

  private actualizarPago(pago: Pago, consultado = false): void {
    const c = this.cotizacion();
    if (!c) return;
    this.incierto.set(false);
    this.pago.set(pago);
    this.aprobado.set(pago.estado === 'APROBADO' && consultado);
    const intento = this.api.intento(c.cotizacion_id);
    if (pago.estado === 'RECHAZADO' || pago.estado === 'ERROR') {
      this.api.eliminarIntento(c.cotizacion_id);
      this.error.set(
        `El pago no fue aprobado${pago.codigo_rechazo ? ` (${pago.codigo_rechazo})` : ''}. Puedes intentar nuevamente.`,
      );
    } else if (intento) {
      this.api.guardarIntento(c.cotizacion_id, {
        ...intento,
        pago,
        confirmado: pago.estado === 'APROBADO' && consultado,
      });
    }
  }
}
