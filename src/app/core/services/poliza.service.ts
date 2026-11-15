import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Poliza } from '../models/cotizacion';
import { AuditoriaConsentimientoService } from './auditoria-consentimiento.service';

@Injectable({ providedIn: 'root' })
export class PolizaService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly clientes = inject(AuditoriaConsentimientoService);
  private readonly baseUrl = `${environment.apiUrl}/polizas`;
  private clienteId: { correo: string; id: string } | null = null;

  async listarMisPolizas(): Promise<Poliza[]> {
    const clienteId = await this.resolverClienteId();
    return firstValueFrom(
      this.http.get<Poliza[]>(`${this.baseUrl}/mis-polizas`, {
        headers: this.headers(clienteId),
      }),
    );
  }

  async obtener(polizaId: string): Promise<Poliza> {
    const clienteId = await this.resolverClienteId();
    return firstValueFrom(
      this.http.get<Poliza>(`${this.baseUrl}/${polizaId}`, {
        headers: this.headers(clienteId),
      }),
    );
  }

  private headers(clienteId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Client-Id': clienteId });
  }

  private async resolverClienteId(): Promise<string> {
    const correo = this.auth.email;
    if (!correo) {
      throw new Error('No pudimos identificar tu sesión. Vuelve a iniciar sesión.');
    }
    if (this.clienteId?.correo !== correo) {
      const res = await firstValueFrom(this.clientes.consultar('correo', correo));
      this.clienteId = { correo, id: res.cliente.id };
    }
    return this.clienteId.id;
  }
}
