import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard, sociosAdminGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
  });

  const ejecutar = () => TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
  const ejecutarSociosAdmin = () =>
    TestBed.runInInjectionContext(() => sociosAdminGuard({} as never, {} as never));

  it('redirige a /login si no hay sesión', () => {
    const res = ejecutar() as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(res)).toBe('/login');
  });

  it('permite el paso con sesión', () => {
    TestBed.inject(AuthService).authenticated.set(true);
    expect(ejecutar()).toBe(true);
  });

  it('redirige clientes autenticados sin SociosAdmin a /cliente', () => {
    TestBed.inject(AuthService).authenticated.set(true);
    const res = ejecutarSociosAdmin() as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(res)).toBe('/cliente');
  });

  it('permite el paso a SociosAdmin', () => {
    const auth = TestBed.inject(AuthService);
    auth.authenticated.set(true);
    vi.spyOn(auth, 'hasGroup').mockReturnValue(true);
    expect(ejecutarSociosAdmin()).toBe(true);
  });
});
