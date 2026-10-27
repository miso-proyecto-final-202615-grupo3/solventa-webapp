import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Producto } from '../../../../core/models/producto';
import { ProductoService } from '../../../../core/services/producto.service';

const FUENTES: Record<string, string> = {
  OPEN_FINANCE: 'Open Finance',
  OPEN_DATA: 'Open Data',
};

@Component({
  selector: 'app-ramos',
  styleUrl: './ramos.component.scss',
  templateUrl: './ramos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RamosComponent implements OnInit {
  private readonly productos = inject(ProductoService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly ramos = signal<Producto[]>([]);
  protected readonly seleccionado = signal<Producto | null>(null);
  protected readonly condiciones = signal<Producto | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.ramos.set(await firstValueFrom(this.productos.listar()));
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  protected elegir(ramo: Producto): void {
    this.seleccionado.set(ramo);
  }

  protected verCondiciones(ramo: Producto): void {
    this.condiciones.set(ramo);
  }

  @HostListener('document:keydown.escape')
  protected cerrarCondiciones(): void {
    this.condiciones.set(null);
  }

  protected fuentes(ramo: Producto): string {
    return ramo.fuentes_datos.map((f) => FUENTES[f] ?? f).join(' y ');
  }

  protected tipoInput(tipo: string): string {
    return tipo === 'number' ? 'number' : 'text';
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 503) {
      return 'Servicio temporalmente no disponible. Intenta de nuevo.';
    }
    return 'No pudimos cargar los ramos de seguro. Intenta de nuevo.';
  }
}
