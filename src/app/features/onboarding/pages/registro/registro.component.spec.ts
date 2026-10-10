import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { RegistroComponent } from './registro.component';

const VALID = {
  nombres: 'Ana',
  apellidos: 'Pérez',
  tipo_documento: 'CC' as const,
  numero_identificacion: '1020304050',
  correo: 'ana.perez@example.com',
  password: 'Secreta123',
  fecha_nacimiento: '1990-05-15',
  pais_residencia: 'Colombia',
  telefono: '+573001234567',
};

describe('RegistroComponent', () => {
  let httpMock: HttpTestingController;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    router = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RegistroComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('mantiene el botón bloqueado hasta completar el formulario', () => {
    const fixture = TestBed.createComponent(RegistroComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    component.form.setValue(VALID);
    fixture.detectChanges();
    expect(submit.disabled).toBe(false);
  });

  it('registra al cliente y navega al home', async () => {
    const fixture = TestBed.createComponent(RegistroComponent);
    const component = fixture.componentInstance;
    component.form.setValue(VALID);

    const pending = component.confirmar();

    const request = httpMock.expectOne('/api/v1/identity-service/clientes/registro');
    expect(request.request.method).toBe('POST');
    request.flush({
      id: 'b7d771b4-1ccd-4dcd-943c-cbce8e739256',
      ...VALID,
      estado_kyc: 'PENDIENTE',
      fecha_creacion: '2026-10-10T22:12:41',
      fecha_actualizacion: '2026-10-10T22:12:41',
    });
    await pending;

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('muestra error cuando el servidor responde 409', async () => {
    const fixture = TestBed.createComponent(RegistroComponent);
    const component = fixture.componentInstance;
    component.form.setValue(VALID);

    const pending = component.confirmar();

    const request = httpMock.expectOne('/api/v1/identity-service/clientes/registro');
    request.flush(
      { detail: 'Ya existe un cliente con ese correo.' },
      { status: 409, statusText: 'Conflict' },
    );
    await pending;

    expect(component.error()).toContain('Ya existe un cliente');
  });

  it('no registra si el formulario es inválido', () => {
    const fixture = TestBed.createComponent(RegistroComponent);
    const component = fixture.componentInstance;

    component.confirmar();

    httpMock.expectNone('/api/v1/identity-service/clientes/registro');
  });
});
