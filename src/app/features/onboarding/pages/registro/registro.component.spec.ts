import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { ClienteResponse } from '../../../../core/models/cliente';
import { RegistroComponent } from './registro.component';

const URL = '/api/v1/identity-service/clientes/registro';

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

function respuestaCliente(): ClienteResponse {
  return {
    id: 'b7d771b4-1ccd-4dcd-943c-cbce8e739256',
    ...VALID,
    estado_kyc: 'PENDIENTE',
    fecha_creacion: '2026-10-10T22:12:41',
    fecha_actualizacion: '2026-10-10T22:12:41',
  };
}

function submitButton(fixture: { nativeElement: HTMLElement }): HTMLButtonElement {
  return fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
}

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

  function crearComponente() {
    const fixture = TestBed.createComponent(RegistroComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, component };
  }

  it('mantiene el botón bloqueado hasta completar el formulario', () => {
    const { fixture, component } = crearComponente();

    expect(submitButton(fixture).disabled).toBe(true);

    component.form.setValue(VALID);
    fixture.detectChanges();
    expect(submitButton(fixture).disabled).toBe(false);
  });

  it('bloquea el botón si el correo es inválido', () => {
    const { fixture, component } = crearComponente();
    component.form.patchValue({ ...VALID, correo: 'no-es-correo' });
    fixture.detectChanges();
    expect(submitButton(fixture).disabled).toBe(true);
  });

  it('bloquea el botón si la fecha de nacimiento es futura', () => {
    const { fixture, component } = crearComponente();
    component.form.patchValue({ ...VALID, fecha_nacimiento: '2999-01-01' });
    fixture.detectChanges();
    expect(submitButton(fixture).disabled).toBe(true);
  });

  it('bloquea el botón si el teléfono no es válido', () => {
    const { fixture, component } = crearComponente();
    component.form.patchValue({ ...VALID, telefono: 'telefono' });
    fixture.detectChanges();
    expect(submitButton(fixture).disabled).toBe(true);
  });

  it('bloquea el botón si la contraseña es corta', () => {
    const { fixture, component } = crearComponente();
    component.form.patchValue({ ...VALID, password: 'corta' });
    fixture.detectChanges();
    expect(submitButton(fixture).disabled).toBe(true);
  });

  it('bloquea el botón si faltan campos obligatorios', () => {
    const { fixture, component } = crearComponente();
    component.form.patchValue({ ...VALID, pais_residencia: '' });
    fixture.detectChanges();
    expect(submitButton(fixture).disabled).toBe(true);
  });

  it('pone el estado enviando durante la petición y lo limpia al terminar', async () => {
    const { component } = crearComponente();
    component.form.setValue(VALID);

    const pending = component.confirmar();
    expect(component.enviando()).toBe(true);

    httpMock.expectOne(URL).flush(respuestaCliente());
    await pending;

    expect(component.enviando()).toBe(false);
  });

  it('registra al cliente y navega al home', async () => {
    const { component } = crearComponente();
    component.form.setValue(VALID);

    const pending = component.confirmar();

    const request = httpMock.expectOne(URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(VALID);
    request.flush(respuestaCliente());
    await pending;

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('muestra error 409 y no navega', async () => {
    const { component } = crearComponente();
    component.form.setValue(VALID);

    const pending = component.confirmar();

    httpMock
      .expectOne(URL)
      .flush(
        { detail: 'Ya existe un cliente con ese correo.' },
        { status: 409, statusText: 'Conflict' },
      );
    await pending;

    expect(component.error()).toContain('Ya existe un cliente');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('muestra error 422', async () => {
    const { component } = crearComponente();
    component.form.setValue(VALID);

    const pending = component.confirmar();

    httpMock
      .expectOne(URL)
      .flush({ detail: 'Validación falló' }, { status: 422, statusText: 'Unprocessable Entity' });
    await pending;

    expect(component.error()).toContain('Revisa los datos del formulario');
  });

  it('muestra error 503', async () => {
    const { component } = crearComponente();
    component.form.setValue(VALID);

    const pending = component.confirmar();

    httpMock
      .expectOne(URL)
      .flush({ detail: 'No disponible' }, { status: 503, statusText: 'Service Unavailable' });
    await pending;

    expect(component.error()).toContain('temporalmente no disponible');
  });

  it('muestra error genérico ante fallo de red', async () => {
    const { component } = crearComponente();
    component.form.setValue(VALID);

    const pending = component.confirmar();

    httpMock
      .expectOne(URL)
      .flush(new ErrorEvent('Network error'), { status: 0, statusText: 'Unknown Error' });
    await pending;

    expect(component.error()).toContain('error inesperado');
  });

  it('no registra si el formulario es inválido', () => {
    const { component } = crearComponente();

    component.confirmar();

    httpMock.expectNone(URL);
    expect(component.enviando()).toBe(false);
  });
});
