import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  AuditoriaConsentimientoResponse,
  CriterioBusqueda,
  TipoAccionConsentimiento,
} from '../../../../core/models/auditoria-consentimiento';
import { AuditoriaConsentimientoService } from '../../../../core/services/auditoria-consentimiento.service';

const ETIQUETAS_ACCION: Record<TipoAccionConsentimiento, string> = {
  ACEPTACION: 'Aceptación',
  DENEGACION: 'Denegación',
  REVOCACION: 'Revocación',
};

@Component({
  imports: [ReactiveFormsModule, DatePipe],
  selector: 'app-auditoria-consentimiento',
  styleUrl: './auditoria-consentimiento.component.scss',
  templateUrl: './auditoria-consentimiento.component.html',
})
export class AuditoriaConsentimientoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(AuditoriaConsentimientoService);

  readonly buscando = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultado = signal<AuditoriaConsentimientoResponse | null>(null);

  readonly form = this.fb.nonNullable.group({
    criterio: ['identificacion' as CriterioBusqueda],
    valor: ['', [Validators.required, Validators.pattern(/\S/)]],
  });

  async buscar(): Promise<void> {
    if (this.form.invalid || this.buscando()) {
      return;
    }

    const { criterio, valor } = this.form.getRawValue();
    this.buscando.set(true);
    this.error.set(null);
    this.resultado.set(null);

    try {
      this.resultado.set(await firstValueFrom(this.servicio.consultar(criterio, valor)));
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.buscando.set(false);
    }
  }

  etiquetaAccion(accion: TipoAccionConsentimiento): string {
    return ETIQUETAS_ACCION[accion] ?? accion;
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 404) {
        return 'No encontramos un cliente con ese dato.';
      }
      if (err.status === 422) {
        return 'Revisa el dato ingresado.';
      }
      if (err.status === 503) {
        return 'Servicio temporalmente no disponible. Intenta de nuevo.';
      }
    }
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}
