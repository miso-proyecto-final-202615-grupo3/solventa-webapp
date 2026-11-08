import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Producto } from '../../../../../core/models/cotizacion';
import { CotizacionService } from '../../../../../core/services/cotizacion.service';

@Component({
  imports: [RouterLink],
  selector: 'app-catalogo',
  styleUrl: '../adquirir.scss',
  templateUrl: './catalogo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoComponent implements OnInit {
  private readonly cotizaciones = inject(CotizacionService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly productos = signal<Producto[]>([]);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.productos.set(await firstValueFrom(this.cotizaciones.listarProductos()));
    } catch {
      this.error.set('No pudimos cargar el catálogo. Intenta de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }
}
