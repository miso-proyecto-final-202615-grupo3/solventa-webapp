import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { FINALIDADES_DATOS, RETENCION_DATOS } from '../../../../core/constants/politica-datos';
import { TERMINOS_VERSION } from '../../../../core/constants/terminos';
import {
  AuditoriaConsentimientoResponse,
  TipoAccionConsentimiento,
} from '../../../../core/models/auditoria-consentimiento';
import { EstadoConsentimiento } from '../../../../core/models/consentimiento';
import { AuditoriaConsentimientoService } from '../../../../core/services/auditoria-consentimiento.service';
import { ConsentimientoService } from '../../../../core/services/consentimiento.service';

const ETIQUETAS_ACCION: Record<TipoAccionConsentimiento, string> = {
  ACEPTACION: 'Aceptación',
  DENEGACION: 'Denegación',
  REVOCACION: 'Revocación',
};

@Component({
  imports: [DatePipe],
  selector: 'app-perfil',
  styleUrl: './perfil.component.scss',
  templateUrl: './perfil.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly lectura = inject(AuditoriaConsentimientoService);
  private readonly escritura = inject(ConsentimientoService);

  protected readonly version = TERMINOS_VERSION;
  protected readonly finalidades = FINALIDADES_DATOS;
  protected readonly retencion = RETENCION_DATOS;

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly confirmando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly datos = signal<AuditoriaConsentimientoResponse | null>(null);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  protected etiquetaAccion(accion: TipoAccionConsentimiento): string {
    return ETIQUETAS_ACCION[accion] ?? accion;
  }

  protected pedirRevocar(): void {
    this.confirmando.set(true);
  }

  protected cancelar(): void {
    this.confirmando.set(false);
  }

  protected async cambiar(estado: EstadoConsentimiento): Promise<void> {
    const cliente = this.datos()?.cliente;
    if (!cliente || this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.escritura.actualizar(cliente.id, estado));
      this.confirmando.set(false);
      await this.cargar();
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.guardando.set(false);
    }
  }

  private async cargar(): Promise<void> {
    const correo = this.auth.email;
    if (!correo) {
      this.cargando.set(false);
      this.error.set('No pudimos identificar tu sesión. Vuelve a iniciar sesión.');
      return;
    }
    this.cargando.set(true);
    try {
      this.datos.set(await firstValueFrom(this.lectura.consultar('correo', correo)));
      this.error.set(null);
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 404) {
        return 'No encontramos tu registro de consentimiento.';
      }
      if (err.status === 503) {
        return 'Servicio temporalmente no disponible. Intenta de nuevo.';
      }
    }
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}
