import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { TERMINOS_VERSION } from '../../../../core/constants/terminos';
import {
  CotizarRequest,
  CotizacionResponse,
  FuentePerfil,
} from '../../../../core/models/cotizacion';
import { AuditoriaConsentimientoService } from '../../../../core/services/auditoria-consentimiento.service';
import { CotizacionService } from '../../../../core/services/cotizacion.service';

const ETIQUETAS_FUENTE: Record<FuentePerfil, string> = {
  PROVEEDORES: 'Perfil actualizado con proveedores',
  CACHE: 'Perfil recuperado de caché',
  FALLBACK: 'Tarifa estándar de respaldo',
  PARCIAL: 'Perfil parcialmente actualizado',
};

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
  protected readonly versionTerminos = TERMINOS_VERSION;
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

    try {
      const perfil = await firstValueFrom(this.auditoria.consultar('correo', correo));
      this.clienteId.set(perfil.cliente.id);
      this.consentimientoActivo.set(perfil.cliente.estado_consentimiento === 'ACEPTADO');
    } catch {
      this.error.set('No pudimos verificar tu consentimiento. Intenta de nuevo.');
    } finally {
      this.cargandoConsentimiento.set(false);
    }
  }

  protected async cotizar(): Promise<void> {
    if (this.form.invalid || this.cotizando() || !this.consentimientoActivo()) {
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
      ramo: 'VIDA_HIPOTECARIO',
      consentimiento_version: this.versionTerminos,
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

  protected etiquetaFuente(fuente: FuentePerfil): string {
    return ETIQUETAS_FUENTE[fuente];
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
