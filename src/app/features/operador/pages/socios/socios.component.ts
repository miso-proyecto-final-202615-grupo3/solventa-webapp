import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SocioService } from '../../../../core/services/socio.service';
import { SocioRegistrado } from '../../../../core/models/socio';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-socios',
  styleUrl: './socios.component.scss',
  templateUrl: './socios.component.html',
})
export class SociosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(SocioService);

  readonly registrando = signal(false);
  readonly intentoEnvio = signal(false);
  readonly error = signal<string | null>(null);
  readonly socioRegistrado = signal<SocioRegistrado | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)]],
    tipo_socio: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(/\S/)]],
    canal_integracion: [
      '',
      [Validators.required, Validators.maxLength(60), Validators.pattern(/\S/)],
    ],
  });

  async registrar(): Promise<void> {
    this.intentoEnvio.set(true);
    if (this.form.invalid || this.registrando()) return;

    this.registrando.set(true);
    this.error.set(null);
    this.socioRegistrado.set(null);
    try {
      const payload = this.form.getRawValue();
      this.socioRegistrado.set(await firstValueFrom(this.servicio.registrar(payload)));
      this.form.reset({ nombre: '', tipo_socio: '', canal_integracion: '' });
      this.intentoEnvio.set(false);
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.registrando.set(false);
    }
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Tu sesión expiró. Vuelve a ingresar.';
      if (err.status === 403) return 'No tienes permisos para registrar socios.';
      if (err.status === 422) return 'Revisa los datos ingresados.';
      if (err.status === 503) return 'Servicio temporalmente no disponible. Intenta de nuevo.';
    }
    return 'No pudimos registrar el socio. Intenta de nuevo.';
  }
}
