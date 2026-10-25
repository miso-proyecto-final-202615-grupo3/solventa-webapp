import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  AjusteCotizacion,
  CotizarRequest,
  CotizacionResponse,
  ProductoCotizacion,
} from '../../../../core/models/cotizacion';
import { AuditoriaConsentimientoService } from '../../../../core/services/auditoria-consentimiento.service';
import { CotizacionService } from '../../../../core/services/cotizacion.service';

@Component({
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  selector: 'app-cotizar',
  styleUrl: './cotizar.component.scss',
  templateUrl: './cotizar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CotizarComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly auditoria = inject(AuditoriaConsentimientoService);
  private readonly cotizaciones = inject(CotizacionService);
  private readonly fb = inject(FormBuilder);

  protected readonly cargandoConsentimiento = signal(true);
  protected readonly consentimientoActivo = signal(false);
  protected readonly clienteId = signal<string | null>(null);
  protected readonly cotizando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly cotizacion = signal<CotizacionResponse | null>(null);
  protected readonly producto = signal<ProductoCotizacion | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    saldoCredito: [200000000, [Validators.required, Validators.min(1)]],
    municipio: ['Bogotá D.C.', [Validators.required, Validators.minLength(2)]],
    zona: ['URBANA', Validators.required],
    estrato: [4, [Validators.required, Validators.min(1), Validators.max(6)]],
  });

  async ngOnInit(): Promise<void> {
    const correo = this.auth.email;
    if (!correo) {
      this.error.set('No pudimos identificar tu sesión. Vuelve a iniciar sesión.');
      this.cargandoConsentimiento.set(false);
      return;
    }

    const [auditoria, producto] = await Promise.allSettled([
      firstValueFrom(this.auditoria.consultar('correo', correo)),
      firstValueFrom(this.cotizaciones.obtenerProducto('VIDA_HIPOTECARIO')),
    ]);
    if (auditoria.status === 'fulfilled') {
      this.clienteId.set(auditoria.value.cliente.id);
      this.consentimientoActivo.set(auditoria.value.cliente.estado_consentimiento === 'ACEPTADO');
    } else {
      this.error.set('No pudimos verificar tu consentimiento. Intenta de nuevo.');
    }
    if (producto.status === 'fulfilled') {
      this.producto.set(producto.value);
    } else {
      this.error.set('No pudimos cargar los detalles del producto. Intenta de nuevo.');
    }
    this.cargandoConsentimiento.set(false);
  }

  protected async cotizar(): Promise<void> {
    if (this.form.invalid || this.cotizando() || !this.consentimientoActivo() || !this.producto()) {
      this.form.markAllAsTouched();
      return;
    }
    const clienteId = this.clienteId();
    if (!clienteId) {
      this.error.set('No encontramos tu registro de cliente.');
      return;
    }

    const valores = this.form.getRawValue();
    const payload: CotizarRequest = {
      cliente_id: clienteId,
      producto_codigo: 'VIDA_HIPOTECARIO',
      parametros: {
        saldo_credito: valores.saldoCredito,
        ubicacion: {
          municipio: valores.municipio.trim(),
          zona: valores.zona as 'URBANA' | 'RURAL',
          estrato: valores.estrato,
        },
      },
    };

    this.cotizando.set(true);
    this.error.set(null);
    this.cotizacion.set(null);
    try {
      this.cotizacion.set(await firstValueFrom(this.cotizaciones.cotizar(payload)));
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.cotizando.set(false);
    }
  }

  protected etiquetaFuente(resultado: CotizacionResponse): string {
    if (!resultado.degradada) return 'Perfil actualizado con proveedores';
    if (resultado.motivos_degradacion.includes('OPEN_DATA_CACHE')) {
      return 'Riesgo territorial recuperado de caché';
    }
    return 'Tarifa calculada con factores estándar';
  }

  protected montoAjuste(ajuste: AjusteCotizacion): number {
    return ajuste.tipo === 'RECARGO' ? ajuste.valor : -ajuste.valor;
  }

  protected totalImpuestos(cotizacion: CotizacionResponse): number {
    return cotizacion.impuestos.reduce((total, impuesto) => total + impuesto.valor, 0);
  }

  protected moneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 403) {
        this.consentimientoActivo.set(false);
        return 'Tu consentimiento no está activo. Actívalo para solicitar una cotización personalizada.';
      }
      if (err.status === 503) {
        return 'El servicio de cotización no está disponible. Intenta de nuevo.';
      }
      if (err.status === 422) {
        return 'Revisa el saldo del crédito y los datos de ubicación.';
      }
    }
    return 'No pudimos generar la cotización. Intenta de nuevo.';
  }
}
