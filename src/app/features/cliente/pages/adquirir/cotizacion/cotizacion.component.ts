import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Ajuste } from '../../../../../core/models/cotizacion';
import { CotizacionService } from '../../../../../core/services/cotizacion.service';
import { formatearMonto } from '../../../../../core/utils/parametros';
import { PasosCompraComponent } from '../../../../../shared/pasos-compra/pasos-compra.component';

@Component({
  imports: [DatePipe, RouterLink, PasosCompraComponent],
  selector: 'app-cotizacion',
  styleUrl: '../adquirir.scss',
  templateUrl: './cotizacion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CotizacionComponent implements OnInit {
  private readonly router = inject(Router);

  protected readonly cotizacion = inject(CotizacionService).ultima;

  async ngOnInit(): Promise<void> {
    // Sin una cotización en memoria (p. ej. tras recargar) no hay nada que mostrar.
    if (!this.cotizacion()) {
      await this.router.navigateByUrl('/cliente/adquirir');
    }
  }

  protected monto(valor: string, moneda: string): string {
    return formatearMonto(valor, moneda);
  }

  /** Los ajustes porcentuales llegan como tasa, no como dinero. */
  protected valorAjuste(a: Ajuste, moneda: string): string {
    return /porc|percent/i.test(a.tipo) ? `${a.valor} %` : formatearMonto(a.valor, moneda);
  }
}
