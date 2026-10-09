import { Injectable, signal } from '@angular/core';

export interface Credentials {
  email: string;
  password: string;
}

export class AuthError extends Error {}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly authenticated = signal(false);

  /**
   * Stub hasta tener backend de autenticación: acepta cualquier credencial no vacía.
   * Reemplazar por la llamada HTTP real; debe lanzar AuthError con mensaje listo para mostrar.
   */
  async login(credentials: Credentials): Promise<void> {
    if (!credentials.email || !credentials.password) {
      throw new AuthError('Ingresa tu correo y tu contraseña.');
    }
    this.authenticated.set(true);
  }

  logout(): void {
    this.authenticated.set(false);
  }
}
