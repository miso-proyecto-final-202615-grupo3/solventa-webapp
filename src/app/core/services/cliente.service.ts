import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClienteCreate, ClienteResponse } from '../models/cliente';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clientes`;

  registrar(payload: ClienteCreate): Observable<ClienteResponse> {
    return this.http.post<ClienteResponse>(`${this.baseUrl}/registro`, payload);
  }
}
