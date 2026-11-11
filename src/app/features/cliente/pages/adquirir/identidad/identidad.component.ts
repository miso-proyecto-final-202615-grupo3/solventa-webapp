import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CotizacionService } from '../../../../../core/services/cotizacion.service';
import { VerificacionKycService } from '../../../../../core/services/verificacion-kyc.service';
import { KYC_VALIDADO, VerificacionKycAml } from '../../../../../core/models/verificacion-kyc';
import { PasosCompraComponent } from '../../../../../shared/pasos-compra/pasos-compra.component';

type Lado = 'frontal' | 'reverso';

const INTERVALO_CONSULTA_MS = 2000;
const MAX_CONSULTAS = 15;

@Component({
  imports: [RouterLink, PasosCompraComponent],
  selector: 'app-identidad',
  styleUrls: ['../adquirir.scss', './identidad.component.scss'],
  templateUrl: './identidad.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentidadComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly kyc = inject(VerificacionKycService);
  private destruido = false;
  private verificacionId: string | null = null;

  protected readonly cotizacion = inject(CotizacionService).ultima;
  protected readonly cargando = signal(true);
  protected readonly yaVerificado = signal(false);
  protected readonly perfilFallido = signal(false);
  protected readonly verificando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorArchivo = signal<Record<Lado, string | null>>({
    frontal: null,
    reverso: null,
  });
  protected readonly frontal = signal<File | null>(null);
  protected readonly reverso = signal<File | null>(null);
  protected readonly resultado = signal<VerificacionKycAml | null>(null);
  /** La verificación sigue pendiente tras agotar las consultas automáticas. */
  protected readonly enProceso = signal(false);

  protected readonly aprobado = computed(() => this.resultado()?.estado === 'APROBADO');
  protected readonly rechazado = computed(() => this.resultado()?.estado === 'RECHAZADO');
  protected readonly puedeIniciar = computed(
    () => !!this.frontal() && !!this.reverso() && !this.verificando(),
  );

  async ngOnInit(): Promise<void> {
    if (!this.cotizacion()) {
      await this.router.navigateByUrl('/cliente/adquirir');
      return;
    }
    await this.cargarPerfil();
  }

  ngOnDestroy(): void {
    this.destruido = true;
  }

  protected async cargarPerfil(): Promise<void> {
    const cotizacion = this.cotizacion();
    if (!cotizacion) return;
    this.cargando.set(true);
    this.error.set(null);
    this.perfilFallido.set(false);
    try {
      const perfil = await firstValueFrom(this.kyc.obtenerPerfil(cotizacion.cliente_id));
      this.yaVerificado.set(perfil.estado_kyc === KYC_VALIDADO);
    } catch (err) {
      this.perfilFallido.set(true);
      this.error.set(this.mensajeError(err, 'No pudimos consultar tu estado de verificación.'));
    } finally {
      this.cargando.set(false);
    }
  }

  protected etiquetaResultado(resultado: string): string {
    return resultado === 'APROBADO'
      ? 'aprobado'
      : resultado === 'RECHAZADO'
        ? 'rechazado'
        : 'pendiente';
  }

  protected seleccionar(lado: Lado, evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    const errores = { ...this.errorArchivo(), [lado]: null as string | null };
    let valido = archivo;
    if (archivo && !archivo.type.startsWith('image/')) {
      errores[lado] = 'Selecciona una imagen (JPG o PNG).';
      valido = null;
    }
    this.errorArchivo.set(errores);
    (lado === 'frontal' ? this.frontal : this.reverso).set(valido);
  }

  protected async iniciar(): Promise<void> {
    const cotizacion = this.cotizacion();
    const frontal = this.frontal();
    const reverso = this.reverso();
    if (!cotizacion || !frontal || !reverso || this.verificando()) return;
    this.verificando.set(true);
    this.error.set(null);
    this.enProceso.set(false);
    this.resultado.set(null);
    try {
      const inicio = await firstValueFrom(
        this.kyc.iniciar(cotizacion.cliente_id, frontal, reverso),
      );
      this.verificacionId = inicio.verificacion_id;
      await this.esperarResultado();
    } catch (err) {
      this.error.set(
        this.mensajeError(err, 'No pudimos iniciar la verificación. Intenta de nuevo.'),
      );
    } finally {
      this.verificando.set(false);
    }
  }

  protected async consultarDeNuevo(): Promise<void> {
    if (this.verificando() || !this.verificacionId) return;
    this.verificando.set(true);
    this.error.set(null);
    try {
      await this.esperarResultado();
    } catch (err) {
      this.error.set(
        this.mensajeError(err, 'No pudimos consultar el resultado. Intenta de nuevo.'),
      );
    } finally {
      this.verificando.set(false);
    }
  }

  protected reintentar(): void {
    this.verificacionId = null;
    this.resultado.set(null);
    this.enProceso.set(false);
    this.frontal.set(null);
    this.reverso.set(null);
    this.error.set(null);
  }

  protected async siguiente(): Promise<void> {
    const cotizacion = this.cotizacion();
    if (!cotizacion) return;
    await this.router.navigate(['/cliente/adquirir', cotizacion.producto_codigo, 'pago']);
  }

  private async esperarResultado(): Promise<void> {
    const cotizacion = this.cotizacion();
    if (!cotizacion || !this.verificacionId) return;
    for (let i = 0; i < MAX_CONSULTAS && !this.destruido; i++) {
      const verificacion = await firstValueFrom(
        this.kyc.consultar(cotizacion.cliente_id, this.verificacionId),
      );
      if (verificacion.estado !== 'PENDIENTE') {
        this.resultado.set(verificacion);
        return;
      }
      await new Promise((resolver) => setTimeout(resolver, INTERVALO_CONSULTA_MS));
    }
    if (!this.destruido) this.enProceso.set(true);
  }

  private mensajeError(err: unknown, porDefecto: string): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 404) return 'No encontramos tu registro de cliente.';
      if (err.status === 422) return 'Revisa las fotos del documento e intenta de nuevo.';
      if (err.status === 503) return 'Servicio temporalmente no disponible. Intenta de nuevo.';
    }
    return porDefecto;
  }
}
