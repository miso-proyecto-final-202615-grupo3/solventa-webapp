import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { TrazabilidadEmision } from '../models/trazabilidad-emision';

@Injectable({ providedIn: 'root' })
export class AuditoriaEmisionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${environment.apiUrl}/auditoria-emision`;

  consultar(numeroPoliza: string): Observable<TrazabilidadEmision> {
    let headers = new HttpHeaders();
    if (this.auth.token) headers = headers.set('Authorization', `Bearer ${this.auth.token}`);
    const params = new HttpParams().set('numero_poliza', numeroPoliza.trim());
    return this.http.get<TrazabilidadEmision>(this.url, { headers, params });
  }
}
