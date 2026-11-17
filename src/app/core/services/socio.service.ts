import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { RegistrarSocioRequest, SocioRegistrado } from '../models/socio';

@Injectable({ providedIn: 'root' })
export class SocioService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${environment.apiUrl}/socios`;

  registrar(payload: RegistrarSocioRequest): Observable<SocioRegistrado> {
    let headers = new HttpHeaders();
    if (this.auth.token) headers = headers.set('Authorization', `Bearer ${this.auth.token}`);
    return this.http.post<SocioRegistrado>(this.url, payload, { headers });
  }

  listar(): Observable<SocioRegistrado[]> {
    let headers = new HttpHeaders();
    if (this.auth.token) headers = headers.set('Authorization', `Bearer ${this.auth.token}`);
    return this.http.get<SocioRegistrado[]>(this.url, { headers });
  }
}
