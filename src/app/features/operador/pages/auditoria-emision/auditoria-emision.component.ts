import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuditoriaEmisionService } from '../../../../core/services/auditoria-emision.service';
import {
  EventoTrazabilidadEmision,
  TrazabilidadEmision,
} from '../../../../core/models/trazabilidad-emision';

const ETIQUETAS_EVENTO: Record<string, string> = {
  CONDICIONES_ACEPTADAS: 'Aceptación de condiciones',
  CONDICIONES_RECHAZADAS: 'Rechazo de condiciones',
  KYC_AML_SOLICITADA: 'Solicitud de verificación KYC/AML',
  KYC_AML_INICIADA: 'Verificación KYC/AML iniciada',
  KYC_AML_RESULTADO: 'Resultado de verificación KYC/AML',
  KYC_AML_REINTENTO: 'Reintento de verificación KYC/AML',
  KYC_AML_ERROR: 'Error de verificación KYC/AML',
  VALIDACION_FIRMA: 'Validación de firma',
  VALIDACION_PAGO: 'Validación de pago',
  VALIDACION_COTIZACION: 'Validación de cotización',
  PAGO_INICIADO: 'Pago iniciado',
  PAGO_REINTENTO: 'Reintento de pago',
  PAGO_RESULTADO: 'Resultado de pago',
  PAGO_ERROR: 'Error de pago',
  FIRMA_CAPTURADA: 'Firma capturada',
  FIRMA_VINCULADA: 'Firma vinculada a póliza',
  POLIZA_EMITIDA: 'Emisión de póliza',
};

@Component({
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  selector: 'app-auditoria-emision',
  styleUrl: './auditoria-emision.component.scss',
  templateUrl: './auditoria-emision.component.html',
})
export class AuditoriaEmisionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(AuditoriaEmisionService);

  readonly buscando = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultado = signal<TrazabilidadEmision | null>(null);
  readonly form = this.fb.nonNullable.group({
    numeroPoliza: ['', [Validators.required, Validators.pattern(/^POL-[A-Za-z0-9-]{6,46}$/)]],
  });

  async buscar(): Promise<void> {
    if (this.form.invalid || this.buscando()) return;
    this.buscando.set(true);
    this.error.set(null);
    this.resultado.set(null);
    try {
      this.resultado.set(
        await firstValueFrom(this.servicio.consultar(this.form.getRawValue().numeroPoliza)),
      );
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.buscando.set(false);
    }
  }

  etiquetaEvento(evento: EventoTrazabilidadEmision): string {
    return ETIQUETAS_EVENTO[evento.tipo] ?? evento.tipo;
  }

  detalleEvento(evento: EventoTrazabilidadEmision): string {
    return (
      Object.entries(evento.detalles)
        .map(([clave, valor]) => `${clave}: ${String(valor)}`)
        .join(' · ') || '—'
    );
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Inicia sesión para consultar la trazabilidad.';
      if (err.status === 403) return 'Acceso exclusivo para auditores autorizados.';
      if (err.status === 404) return 'No encontramos una póliza con ese número.';
      if (err.status === 503)
        return 'No fue posible consultar el historial completo. Intenta de nuevo.';
      if (err.status === 422) return 'Revisa el número de póliza ingresado.';
    }
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}
