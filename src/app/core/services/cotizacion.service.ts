import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Cotizacion, Producto, SolicitudCotizacion } from '../models/cotizacion';
import { AuditoriaConsentimientoService } from './auditoria-consentimiento.service';

export class SesionError extends Error {}

@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly clientes = inject(AuditoriaConsentimientoService);
  private readonly baseUrl = environment.apiUrl;
  private clienteId: { correo: string; id: string } | null = null;

  /** Última cotización obtenida; la pantalla de resultado la lee de aquí. */
  readonly ultima = signal<Cotizacion | null>(null);

  listarProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.baseUrl}/productos`);
  }

  async cotizar(
    productoCodigo: string,
    parametros: SolicitudCotizacion['parametros'],
  ): Promise<Cotizacion> {
    const cliente_id = await this.resolverClienteId();
    const solicitud: SolicitudCotizacion = {
      cliente_id,
      producto_codigo: productoCodigo,
      parametros,
    };
    const cotizacion = await firstValueFrom(
      this.http
        .post<Cotizacion>(`${this.baseUrl}/cotizaciones`, solicitud)
        .pipe(tap((c) => this.ultima.set(c))),
    );
    return cotizacion;
  }

  /** El contrato pide el id del cliente; se obtiene una vez por sesión a partir de su correo. */
  private async resolverClienteId(): Promise<string> {
    const correo = this.auth.email;
    if (!correo) {
      throw new SesionError('No pudimos identificar tu sesión. Vuelve a iniciar sesión.');
    }
    if (this.clienteId?.correo !== correo) {
      const res = await firstValueFrom(this.clientes.consultar('correo', correo));
      this.clienteId = { correo, id: res.cliente.id };
    }
    return this.clienteId.id;
  }
}
