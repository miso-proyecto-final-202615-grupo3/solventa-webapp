import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { SociosComponent } from './socios.component';

const URL = '/api/v1/bff-web/socios';

describe('SociosComponent', () => {
  let fixture: ComponentFixture<SociosComponent>;
  let httpMock: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const enviar = () => el().querySelector('button[type="submit"]') as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SociosComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: 'token-socios-admin' } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SociosComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne(URL).flush([]);
  });

  afterEach(() => httpMock.verify());

  it('muestra validación cuando se intenta registrar con campos vacíos', () => {
    enviar().click();
    fixture.detectChanges();

    expect(enviar().disabled).toBe(false);
    expect(el().querySelectorAll('.socios__field-error')).toHaveLength(4);
    httpMock.expectNone(URL);
  });

  it('registra los datos y muestra el estado pendiente', async () => {
    const [correo, nombre, tipo, canal] = Array.from(el().querySelectorAll('input'));
    for (const [input, value] of [
      [correo, 'socio@yopmail.com'],
      [nombre, 'Banco Andino'],
      [tipo, 'Banco'],
      [canal, 'API'],
    ] as const) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    enviar().click();

    const request = httpMock.expectOne(URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      nombre: 'Banco Andino',
      correo: 'socio@yopmail.com',
      tipo_socio: 'Banco',
      canal_integracion: 'API',
    });
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-socios-admin');
    request.flush({
      id: 'socio-1',
      nombre: 'Banco Andino',
      tipo_socio: 'Banco',
      canal_integracion: 'API',
      correo: 'socio@yopmail.com',
      estado: 'ACTIVO',
      creado_en: '2026-11-16T15:00:00Z',
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector('[role="status"]')?.textContent).toContain('ACTIVO');
    expect(el().textContent).toContain('Banco Andino');
    expect(enviar().disabled).toBe(false);
  });

  it('informa cuando el usuario no tiene permisos de administración', async () => {
    const [correo, nombre, tipo, canal] = Array.from(el().querySelectorAll('input'));
    for (const [input, value] of [
      [correo, 'socio@yopmail.com'],
      [nombre, 'Banco Andino'],
      [tipo, 'Banco'],
      [canal, 'API'],
    ] as const) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    enviar().click();
    httpMock
      .expectOne(URL)
      .flush(
        { detail: 'Acceso exclusivo para administradores de socios.' },
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('No tienes permisos');
  });
});
