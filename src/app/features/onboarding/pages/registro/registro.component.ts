import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ClienteCreate } from '../../../../core/models/cliente';
import { ClienteService } from '../../../../core/services/cliente.service';
import { fechaNacimientoValida } from '../../../../core/validators/fecha-nacimiento.validator';

const TELEFONO_PATTERN = /^\+?[0-9][0-9\s\-()]{6,19}$/;

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-registro',
  styleUrl: './registro.component.scss',
  templateUrl: './registro.component.html',
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);

  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    tipo_documento: ['CC' as const, Validators.required],
    numero_identificacion: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(30)],
    ],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    fecha_nacimiento: ['', [Validators.required, fechaNacimientoValida]],
    pais_residencia: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    telefono: ['', [Validators.required, Validators.pattern(TELEFONO_PATTERN)]],
  });

  async confirmar(): Promise<void> {
    if (this.form.invalid || this.enviando()) {
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    try {
      const payload = this.form.getRawValue() as ClienteCreate;
      await firstValueFrom(this.clienteService.registrar(payload));
      this.router.navigate(['/']);
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.enviando.set(false);
    }
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 409) {
        return 'Ya existe un cliente con ese correo o documento.';
      }
      if (err.status === 422) {
        return 'Revisa los datos del formulario.';
      }
      if (err.status === 503) {
        return 'Servicio temporalmente no disponible. Intenta de nuevo.';
      }
    }
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}
