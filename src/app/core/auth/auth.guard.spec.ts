import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
  });

  const ejecutar = () => TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

  it('redirige a /login si no hay sesión', () => {
    const res = ejecutar() as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(res)).toBe('/login');
  });

  it('permite el paso con sesión', () => {
    TestBed.inject(AuthService).authenticated.set(true);
    expect(ejecutar()).toBe(true);
  });
});
