import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CotizacionService } from '../../../../../core/services/cotizacion.service';
import { PasosCompraComponent } from '../../../../../shared/pasos-compra/pasos-compra.component';

/** Marcador de posición: el pago se implementa en un paso posterior del flujo. */
@Component({
  imports: [RouterLink, PasosCompraComponent],
  selector: 'app-pago',
  styleUrl: '../adquirir.scss',
  template: `
    @if (cotizacion()) {
      <section class="adq adq--form">
        <app-pasos-compra [actual]="4" />
        <h1 class="adq__title">Pago</h1>
        <div class="callout" data-testid="pago-pendiente">
          El pago de tu póliza estará disponible muy pronto.
        </div>
        <div class="adq__acciones">
          <a class="btn btn--secondary btn--lg" routerLink="/cliente/adquirir"
            >Volver al catálogo</a
          >
        </div>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagoComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly cotizacion = inject(CotizacionService).ultima;

  async ngOnInit(): Promise<void> {
    if (!this.cotizacion()) {
      await this.router.navigateByUrl('/cliente/adquirir');
    }
  }
}
