import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdquisicionService } from '../../../../../core/services/adquisicion.service';
import { CotizacionService } from '../../../../../core/services/cotizacion.service';
import { PasosCompraComponent } from '../../../../../shared/pasos-compra/pasos-compra.component';

@Component({
  selector: 'app-firma',
  imports: [RouterLink, PasosCompraComponent],
  templateUrl: './firma.component.html',
  styleUrls: ['../adquirir.scss', './firma.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirmaComponent implements OnInit, OnDestroy {
  @ViewChild('canvas') private canvas?: ElementRef<HTMLCanvasElement>;
  private readonly router = inject(Router);
  private readonly adquisicion = inject(AdquisicionService);
  private readonly cotizaciones = inject(CotizacionService);
  private dibujando = false;
  private destruido = false;
  private productoId: string | null = null;
  private necesitaConsulta = false;
  protected readonly cotizacion = this.cotizaciones.ultima;
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly tieneFirma = signal(false);
  protected readonly validada = signal(false);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const c = this.cotizacion();
    if (!c) {
      await this.router.navigateByUrl('/cliente/adquirir');
      return;
    }
    await this.cargar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
  }

  private async cargar(): Promise<void> {
    const c = this.cotizacion();
    if (!c) return;
    this.cargando.set(true);
    this.tieneFirma.set(false);
    this.error.set(null);
    try {
      await this.resolverProducto(c.producto_codigo);
      try {
        const firma = await firstValueFrom(this.adquisicion.consultarFirma(c.cotizacion_id));
        this.validada.set(firma.estado === 'CAPTURADA' || firma.estado === 'VINCULADA');
      } catch (err) {
        if (!(err instanceof HttpErrorResponse && err.status === 404)) throw err;
      }
    } catch {
      this.necesitaConsulta = true;
      this.error.set(
        'No pudimos consultar el producto o la firma. Dibuja tu firma y pulsa Enviar firma para intentarlo de nuevo.',
      );
    } finally {
      if (!this.destruido) this.cargando.set(false);
    }
  }

  protected comenzar(evento: PointerEvent): void {
    if (this.enviando() || this.validada()) return;
    const canvas = this.canvas?.nativeElement;
    const contexto = canvas?.getContext('2d');
    if (!canvas || !contexto) {
      this.error.set('No pudimos abrir el área de firma en este navegador.');
      return;
    }
    evento.preventDefault();
    canvas.setPointerCapture(evento.pointerId);
    this.dibujando = true;
    const { x, y } = this.posicion(evento, canvas);
    contexto.lineWidth = 2.5;
    contexto.lineCap = 'round';
    contexto.lineJoin = 'round';
    contexto.strokeStyle = '#101b2d';
    contexto.beginPath();
    contexto.moveTo(x, y);
    contexto.lineTo(x + 0.1, y + 0.1);
    contexto.stroke();
    this.tieneFirma.set(true);
  }

  protected mover(evento: PointerEvent): void {
    if (!this.dibujando) return;
    const canvas = this.canvas?.nativeElement;
    const contexto = canvas?.getContext('2d');
    if (!canvas || !contexto) return;
    const { x, y } = this.posicion(evento, canvas);
    contexto.lineTo(x, y);
    contexto.stroke();
  }

  protected terminar(): void {
    this.dibujando = false;
  }

  protected limpiar(): void {
    const canvas = this.canvas?.nativeElement;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    this.tieneFirma.set(false);
    this.error.set(null);
  }

  protected async enviar(): Promise<void> {
    const c = this.cotizacion();
    const canvas = this.canvas?.nativeElement;
    if (!c || !canvas || !this.tieneFirma() || this.enviando()) return;
    this.enviando.set(true);
    this.error.set(null);
    try {
      if (!this.productoId) await this.resolverProducto(c.producto_codigo);
      if (this.necesitaConsulta) {
        try {
          const firma = await firstValueFrom(this.adquisicion.consultarFirma(c.cotizacion_id));
          if (firma.estado === 'CAPTURADA' || firma.estado === 'VINCULADA') {
            this.validada.set(true);
            this.necesitaConsulta = false;
            return;
          }
        } catch (err) {
          if (!(err instanceof HttpErrorResponse && err.status === 404)) throw err;
        }
      }
      const imagen = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))),
          'image/png',
        ),
      );
      if (!this.productoId) throw new Error('Producto no encontrado');
      this.necesitaConsulta = true;
      await firstValueFrom(
        this.adquisicion.capturarFirma(c.cotizacion_id, c.cliente_id, this.productoId, imagen),
      );
      const firma = await firstValueFrom(this.adquisicion.consultarFirma(c.cotizacion_id));
      if (firma.estado !== 'CAPTURADA' && firma.estado !== 'VINCULADA') {
        throw new Error('Firma no vigente');
      }
      this.validada.set(true);
      this.necesitaConsulta = false;
    } catch {
      this.error.set('No pudimos confirmar la firma. Pulsa Enviar firma para intentarlo de nuevo.');
    } finally {
      if (!this.destruido) this.enviando.set(false);
    }
  }

  private async resolverProducto(codigo: string): Promise<void> {
    const productos = await firstValueFrom(this.cotizaciones.listarProductos());
    const producto = productos.find((p) => p.codigo === codigo);
    if (!producto) throw new Error('Producto no encontrado');
    this.productoId = producto.producto_id;
  }

  private posicion(evento: PointerEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((evento.clientX - rect.left) * canvas.width) / rect.width,
      y: ((evento.clientY - rect.top) * canvas.height) / rect.height,
    };
  }
}
