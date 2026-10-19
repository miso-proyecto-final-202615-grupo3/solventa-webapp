import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Credentials {
  email: string;
  password: string;
}

interface AutenticarResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string | null;
  expires_in?: number | null;
  token_type: string;
}

export class AuthError extends Error {}

interface Sesion {
  token: string;
  email: string;
}

const STORAGE_KEY = 'solventa.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clientes`;
  private sesion: Sesion | null = this.leerSesion();

  readonly authenticated = signal(this.sesion !== null);

  get token(): string | null {
    return this.sesion?.token ?? null;
  }

  /** Correo con el que inició sesión; identifica al cliente en las consultas de consentimiento. */
  get email(): string | null {
    return this.sesion?.email ?? null;
  }

  /** Autentica contra el BFF; lanza AuthError con un mensaje listo para mostrar. */
  async login(credentials: Credentials): Promise<void> {
    if (!credentials.email || !credentials.password) {
      throw new AuthError('Ingresa tu correo y tu contraseña.');
    }
    try {
      const res = await firstValueFrom(
        this.http.post<AutenticarResponse>(`${this.baseUrl}/autenticar`, {
          correo: credentials.email,
          password: credentials.password,
        }),
      );
      this.guardarSesion({ token: res.access_token, email: credentials.email.trim() });
    } catch (e) {
      throw this.traducirError(e);
    }
  }

  logout(): void {
    this.sesion = null;
    this.authenticated.set(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // sessionStorage no disponible: la sesión solo vivía en memoria.
    }
  }

  private guardarSesion(sesion: Sesion): void {
    this.sesion = sesion;
    this.authenticated.set(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    } catch {
      // Sin persistencia: la sesión dura hasta recargar la página.
    }
  }

  private leerSesion(): Sesion | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const sesion = raw ? (JSON.parse(raw) as Partial<Sesion>) : null;
      return sesion?.token && sesion.email ? { token: sesion.token, email: sesion.email } : null;
    } catch {
      return null;
    }
  }

  private traducirError(e: unknown): AuthError | unknown {
    if (e instanceof HttpErrorResponse && e.status === 401) {
      return new AuthError('Correo o contraseña incorrectos.');
    }
    return e;
  }
}
