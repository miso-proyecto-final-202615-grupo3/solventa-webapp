import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Condiciones, DecisionCondiciones } from '../../../../../core/models/condiciones';
import { CondicionesService } from '../../../../../core/services/condiciones.service';
import { CotizacionService } from '../../../../../core/services/cotizacion.service';
import { aplanarParticulares, bloquesTexto } from '../../../../../core/utils/condiciones';
import { PasosCompraComponent } from '../../../../../shared/pasos-compra/pasos-compra.component';

@Component({
  imports: [DatePipe, RouterLink, PasosCompraComponent],
  selector: 'app-condiciones',
  styleUrls: ['../adquirir.scss', './condiciones.component.scss'],
  templateUrl: './condiciones.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CondicionesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly condicionesApi = inject(CondicionesService);

  protected readonly cotizacion = inject(CotizacionService).ultima;
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly condiciones = signal<Condiciones | null>(null);
  protected readonly aceptadas = signal(false);

  protected readonly generales = computed(() =>
    bloquesTexto(this.condiciones()?.condiciones_generales ?? ''),
  );
  protected readonly particulares = computed(() =>
    aplanarParticulares(
      this.condiciones()?.condiciones_particulares ?? {},
      '',
      this.cotizacion()?.moneda ?? 'COP',
    ),
  );

  async ngOnInit(): Promise<void> {
    const cotizacion = this.cotizacion();
    // Sin una cotización en memoria (p. ej. tras recargar) no hay a qué condiciones acceder.
    if (!cotizacion) {
      await this.router.navigateByUrl('/cliente/adquirir');
      return;
    }
    try {
      const condiciones = await firstValueFrom(
        this.condicionesApi.obtener(cotizacion.cotizacion_id),
      );
      this.condiciones.set(condiciones);
      this.aceptadas.set(condiciones.ultima_decision?.decision === 'ACEPTADA');
    } catch (err) {
      this.error.set(this.mensajeError(err, 'No pudimos cargar las condiciones de la póliza.'));
    } finally {
      this.cargando.set(false);
    }
  }

  protected alternarAceptacion(evento: Event): void {
    this.aceptadas.set((evento.target as HTMLInputElement).checked);
  }

  protected async siguiente(): Promise<void> {
    const cotizacion = this.cotizacion();
    const condiciones = this.condiciones();
    if (!cotizacion || !condiciones || !this.aceptadas() || this.enviando()) return;
    const yaAceptada = condiciones.ultima_decision?.decision === 'ACEPTADA';
    if (!yaAceptada && !(await this.registrar('ACEPTADA'))) return;
    await this.router.navigate(['/cliente/adquirir', cotizacion.producto_codigo, 'identidad']);
  }

  protected async rechazar(): Promise<void> {
    if (!this.condiciones() || this.enviando()) return;
    if (await this.registrar('RECHAZADA')) {
      await this.router.navigateByUrl('/cliente/adquirir');
    }
  }

  private async registrar(decision: DecisionCondiciones): Promise<boolean> {
    const cotizacion = this.cotizacion();
    const condiciones = this.condiciones();
    if (!cotizacion || !condiciones) return false;
    this.enviando.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.condicionesApi.decidir(
          cotizacion.cotizacion_id,
          condiciones.condiciones_cotizacion_id,
          decision,
        ),
      );
      return true;
    } catch (err) {
      this.error.set(this.mensajeError(err, 'No pudimos registrar tu decisión. Intenta de nuevo.'));
      return false;
    } finally {
      this.enviando.set(false);
    }
  }

  private mensajeError(err: unknown, porDefecto: string): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 404) return 'No encontramos las condiciones de esta cotización.';
      if (err.status === 409 || err.status === 410) {
        return 'La cotización ya no está vigente. Genera una nueva cotización.';
      }
      if (err.status === 503) return 'Servicio temporalmente no disponible. Intenta de nuevo.';
    }
    return porDefecto;
  }
}
