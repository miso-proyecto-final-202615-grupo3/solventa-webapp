import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RecuperacionClaveService } from '../../../core/services/recuperacion-clave.service';

type PasoRecuperacion = 'solicitud' | 'confirmacion' | 'completada';

@Component({
  selector: 'app-recuperar-clave',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar.component.html',
  styleUrl: './recuperar.component.scss',
})
export class RecuperarClaveComponent {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(RecuperacionClaveService);

  readonly paso = signal<PasoRecuperacion>('solicitud');
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly intentoSolicitud = signal(false);
  readonly intentoConfirmacion = signal(false);
  readonly correoSolicitado = signal('');

  readonly solicitudForm = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  readonly confirmacionForm = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(32)]],
    nueva_clave: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmar_clave: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(128)],
    ],
  });

  async solicitarCodigo(): Promise<void> {
    this.intentoSolicitud.set(true);
    if (this.solicitudForm.invalid || this.enviando()) return;

    this.enviando.set(true);
    this.error.set(null);
    const correo = this.solicitudForm.controls.correo.value.trim();
    try {
      await firstValueFrom(this.servicio.solicitar(correo));
      this.correoSolicitado.set(correo);
      this.paso.set('confirmacion');
      this.intentoConfirmacion.set(false);
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.enviando.set(false);
    }
  }

  async confirmarCambio(): Promise<void> {
    this.intentoConfirmacion.set(true);
    if (this.confirmacionForm.invalid || !this.clavesCoinciden() || this.enviando()) {
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    const { codigo, nueva_clave } = this.confirmacionForm.getRawValue();
    try {
      await firstValueFrom(
        this.servicio.confirmar({
          correo: this.correoSolicitado(),
          codigo: codigo.trim(),
          nueva_clave,
        }),
      );
      this.paso.set('completada');
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.enviando.set(false);
    }
  }

  async reenviarCodigo(): Promise<void> {
    if (this.enviando() || !this.correoSolicitado()) return;
    this.enviando.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.servicio.solicitar(this.correoSolicitado()));
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.enviando.set(false);
    }
  }

  volverASolicitud(): void {
    if (this.enviando()) return;
    this.error.set(null);
    this.paso.set('solicitud');
  }

  clavesCoinciden(): boolean {
    const { nueva_clave, confirmar_clave } = this.confirmacionForm.getRawValue();
    return nueva_clave === confirmar_clave;
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 400) return 'El código es inválido o venció. Solicita uno nuevo.';
      if (err.status === 422) return 'La contraseña no cumple la política de seguridad.';
      if (err.status === 429) return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
      if (err.status === 503) return 'Servicio temporalmente no disponible. Intenta de nuevo.';
    }
    return 'No pudimos completar la solicitud. Intenta de nuevo.';
  }
}
