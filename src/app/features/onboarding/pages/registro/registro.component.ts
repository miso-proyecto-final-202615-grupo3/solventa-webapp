import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PAISES } from '../../../../core/constants/paises';
import { ClienteCreate } from '../../../../core/models/cliente';
import { ClienteService } from '../../../../core/services/cliente.service';
import {
  EDAD_MINIMA,
  fechaMaximaMayorDeEdad,
  fechaNacimientoValida,
} from '../../../../core/validators/fecha-nacimiento.validator';
import {
  correoValido,
  paisEnLista,
  soloDigitos,
} from '../../../../core/validators/registro.validators';
import { SoloDigitosDirective } from '../../../../shared/solo-digitos.directive';

export type PasoRegistro = 1 | 2;

/** Campos que se piden en el paso 1 ("Cuéntanos quién eres"). */
const CAMPOS_PASO_1 = [
  'nombres',
  'apellidos',
  'tipo_documento',
  'numero_identificacion',
  'correo',
  'fecha_nacimiento',
  'pais_residencia',
  'telefono',
] as const;

@Component({
  imports: [ReactiveFormsModule, SoloDigitosDirective],
  selector: 'app-registro',
  styleUrl: './registro.component.scss',
  templateUrl: './registro.component.html',
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);

  readonly paso = signal<PasoRegistro>(1);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly verClave = signal(false);

  /** Consentimiento explícito: inicia desmarcado y es obligatorio para continuar. */
  readonly aceptaTerminos = new FormControl(false, {
    nonNullable: true,
    validators: [Validators.requiredTrue],
  });

  readonly form = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    tipo_documento: ['CC' as const, Validators.required],
    numero_identificacion: ['', [Validators.required, soloDigitos(5, 10)]],
    correo: ['', [Validators.required, Validators.maxLength(254), correoValido]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    fecha_nacimiento: ['', [Validators.required, fechaNacimientoValida]],
    pais_residencia: ['', [Validators.required, paisEnLista]],
    telefono: ['', [Validators.required, soloDigitos(7, 15)]],
  });

  readonly paises = PAISES;
  readonly fechaMaxima = fechaMaximaMayorDeEdad();

  private readonly claveActual = signal('');

  /** Requisitos de contraseña mostrados en el paso 2, con su estado en vivo. */
  readonly requisitosClave = computed(() => {
    const clave = this.claveActual();
    return [
      { texto: 'Entre 8 y 128 caracteres', cumple: clave.length >= 8 && clave.length <= 128 },
    ];
  });

  constructor() {
    this.form.controls.password.valueChanges.subscribe((valor) =>
      this.claveActual.set(valor ?? ''),
    );
  }

  /** Un campo del paso 1 muestra su mensaje solo después de que el usuario lo tocó. */
  mostrarError(campo: (typeof CAMPOS_PASO_1)[number]): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  mensajeFechaNacimiento(): string {
    return this.form.controls.fecha_nacimiento.hasError('menorDeEdad')
      ? `Debes ser mayor de ${EDAD_MINIMA} años para crear una cuenta.`
      : 'Ingresa una fecha de nacimiento válida.';
  }

  paso1Valido(): boolean {
    return (
      CAMPOS_PASO_1.every((campo) => this.form.controls[campo].valid) && this.aceptaTerminos.valid
    );
  }

  paso2Valido(): boolean {
    return this.form.controls.password.valid;
  }

  continuarPaso1(): void {
    if (!this.paso1Valido()) {
      return;
    }
    this.error.set(null);
    this.paso.set(2);
  }

  volverPaso1(): void {
    if (this.enviando()) {
      return;
    }
    this.error.set(null);
    this.paso.set(1);
  }

  cancelar(): void {
    this.router.navigate(['/']);
  }

  alternarClave(): void {
    this.verClave.update((valor) => !valor);
  }

  /**
   * Paso 2: crea la cuenta. El consentimiento aceptado en el paso 1 viaja en el
   * mismo registro (`consentimiento_datos`) y el backend lo audita de forma atómica.
   */
  async crearCuenta(): Promise<void> {
    if (!this.paso1Valido() || !this.paso2Valido() || this.enviando()) {
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    try {
      const payload: ClienteCreate = {
        ...(this.form.getRawValue() as Omit<ClienteCreate, 'consentimiento_datos'>),
        consentimiento_datos: this.aceptaTerminos.value,
      };
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
