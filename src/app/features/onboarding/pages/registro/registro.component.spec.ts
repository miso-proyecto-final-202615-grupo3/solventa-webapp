import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { ClienteResponse } from '../../../../core/models/cliente';
import { RegistroComponent } from './registro.component';

const URL = '/api/v1/bff-web/clientes/registro';
const CLIENTE_ID = 'b7d771b4-1ccd-4dcd-943c-cbce8e739256';

const VALID = {
  nombres: 'Ana',
  apellidos: 'Pérez',
  tipo_documento: 'CC' as const,
  numero_identificacion: '1020304050',
  correo: 'ana.perez@example.com',
  password: 'Secreta123',
  fecha_nacimiento: '1990-05-15',
  pais_residencia: 'Colombia',
  telefono: '3001234567',
};

function respuestaCliente(): ClienteResponse {
  return {
    id: CLIENTE_ID,
    ...VALID,
    estado_kyc: 'PENDIENTE',
    fecha_creacion: '2026-10-10T22:12:41',
    fecha_actualizacion: '2026-10-10T22:12:41',
  };
}

function boton(fixture: { nativeElement: HTMLElement }, texto: string): HTMLButtonElement {
  const botones = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
  );
  const encontrado = botones.find((b) => b.textContent?.trim() === texto);
  if (!encontrado) {
    throw new Error(`No hay botón "${texto}"`);
  }
  return encontrado;
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

  /** Completa el paso 1 y avanza al 2. */
  function irAlPaso2() {
    const ctx = crearComponente();
    ctx.component.form.setValue(VALID);
    ctx.component.aceptaTerminos.setValue(true);
    ctx.component.continuarPaso1();
    ctx.fixture.detectChanges();
    return ctx;
  }

  describe('paso 1: Cuéntanos quién eres', () => {
    it('inicia en el paso 1 con "Continuar" bloqueado', () => {
      const { fixture, component } = crearComponente();

      expect(component.paso()).toBe(1);
      expect(fixture.nativeElement.querySelector('h1').textContent).toContain(
        'Cuéntanos quién eres',
      );
      expect(boton(fixture, 'Continuar').disabled).toBe(true);
    });

    it('no pide la contraseña en el paso 1', () => {
      const { fixture } = crearComponente();

      expect(fixture.nativeElement.querySelector('input[type="password"]')).toBeNull();
    });

    it('mantiene "Continuar" bloqueado hasta aceptar el consentimiento', () => {
      const { fixture, component } = crearComponente();

      component.form.setValue(VALID);
      fixture.detectChanges();
      expect(boton(fixture, 'Continuar').disabled).toBe(true);

      component.aceptaTerminos.setValue(true);
      fixture.detectChanges();
      expect(boton(fixture, 'Continuar').disabled).toBe(false);
    });

    it('el checkbox de consentimiento inicia desmarcado', () => {
      const { fixture, component } = crearComponente();

      const checkbox = fixture.nativeElement.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement;

      expect(checkbox.checked).toBe(false);
      expect(component.aceptaTerminos.value).toBe(false);
    });

    it('enlaza al texto legal completo del consentimiento', () => {
      const { fixture } = crearComponente();

      const enlace = fixture.nativeElement.querySelector(
        'a[href="/terminos"]',
      ) as HTMLAnchorElement;

      expect(enlace).not.toBeNull();
      expect(enlace.target).toBe('_blank');
    });

    it.each([
      ['correo inválido', { correo: 'no-es-correo' }],
      ['fecha de nacimiento futura', { fecha_nacimiento: '2999-01-01' }],
      ['menor de edad', { fecha_nacimiento: `${new Date().getFullYear() - 10}-01-01` }],
      ['correo sin dominio', { correo: 'ana@dominio' }],
      ['teléfono con letras', { telefono: 'telefono' }],
      ['teléfono con símbolos', { telefono: '+573001234567' }],
      ['teléfono demasiado corto', { telefono: '123456' }],
      ['cédula de 4 dígitos', { numero_identificacion: '1234' }],
      ['cédula con letras', { numero_identificacion: '12345abc' }],
      ['país vacío', { pais_residencia: '' }],
      ['país fuera de la lista', { pais_residencia: 'Narnia' }],
    ])('no permite continuar con %s', (_caso, cambio) => {
      const { fixture, component } = crearComponente();
      component.form.patchValue({ ...VALID, ...cambio });
      component.aceptaTerminos.setValue(true);
      fixture.detectChanges();

      expect(boton(fixture, 'Continuar').disabled).toBe(true);
      component.continuarPaso1();
      expect(component.paso()).toBe(1);
    });

    it('no exige la contraseña para pasar del paso 1', () => {
      const { component } = crearComponente();
      component.form.patchValue({ ...VALID, password: '' });
      component.aceptaTerminos.setValue(true);

      component.continuarPaso1();

      expect(component.paso()).toBe(2);
    });

    it('"Cancelar" vuelve al inicio', () => {
      const { fixture } = crearComponente();

      boton(fixture, 'Cancelar').click();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('paso 2: Crea tu contraseña', () => {
    it('muestra el paso 2 con los requisitos de contraseña', () => {
      const { fixture, component } = irAlPaso2();

      expect(component.paso()).toBe(2);
      expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Crea tu contraseña');
      expect(fixture.nativeElement.querySelectorAll('.registro__requisitos li').length).toBe(1);
    });

    it('marca el requisito de longitud en vivo', () => {
      const { component } = irAlPaso2();

      component.form.controls.password.setValue('corta');
      expect(component.requisitosClave()[0].cumple).toBe(false);

      component.form.controls.password.setValue('Secreta123');
      expect(component.requisitosClave()[0].cumple).toBe(true);
    });

    it('bloquea "Crear cuenta" si la contraseña es corta', () => {
      const { fixture, component } = irAlPaso2();
      component.form.controls.password.setValue('corta');
      fixture.detectChanges();

      expect(boton(fixture, 'Crear cuenta').disabled).toBe(true);
    });

    it('alterna mostrar y ocultar la contraseña', () => {
      const { fixture, component } = irAlPaso2();
      const campo = () =>
        fixture.nativeElement.querySelector('#registro-password') as HTMLInputElement;

      expect(campo().type).toBe('password');
      component.alternarClave();
      fixture.detectChanges();
      expect(campo().type).toBe('text');
    });

    it('"Volver" regresa al paso 1 conservando los datos', () => {
      const { fixture, component } = irAlPaso2();

      boton(fixture, 'Volver').click();
      fixture.detectChanges();

      expect(component.paso()).toBe(1);
      expect(component.form.controls.nombres.value).toBe('Ana');
    });

    it('registra al cliente con el consentimiento en el mismo envío y navega al inicio', async () => {
      const { component } = irAlPaso2();

      const pending = component.crearCuenta();

      const request = httpMock.expectOne(URL);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ ...VALID, consentimiento_datos: true });
      request.flush(respuestaCliente());
      await pending;

      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('pone el estado enviando durante la petición y lo limpia al terminar', async () => {
      const { component } = irAlPaso2();

      const pending = component.crearCuenta();
      expect(component.enviando()).toBe(true);

      httpMock.expectOne(URL).flush(respuestaCliente());
      await pending;

      expect(component.enviando()).toBe(false);
    });

    it('no hace una llamada aparte para el consentimiento', async () => {
      const { component } = irAlPaso2();

      const pending = component.crearCuenta();
      httpMock.expectOne(URL).flush(respuestaCliente());
      await pending;

      httpMock.expectNone((req) => req.url.endsWith('/consentimiento'));
    });

    it('no registra si falta el consentimiento', () => {
      const { component } = irAlPaso2();
      component.aceptaTerminos.setValue(false);

      component.crearCuenta();

      httpMock.expectNone(URL);
      expect(component.enviando()).toBe(false);
    });

    it.each([
      [409, 'Ya existe un cliente'],
      [422, 'Revisa los datos del formulario'],
      [503, 'temporalmente no disponible'],
    ])('muestra el error %i y no avanza', async (status, mensaje) => {
      const { component } = irAlPaso2();

      const pending = component.crearCuenta();
      httpMock.expectOne(URL).flush({ detail: 'error' }, { status, statusText: 'Error' });
      await pending;

      expect(component.error()).toContain(mensaje);
      expect(component.paso()).toBe(2);
    });

    it('muestra error genérico ante fallo de red', async () => {
      const { component } = irAlPaso2();

      const pending = component.crearCuenta();
      httpMock
        .expectOne(URL)
        .flush(new ErrorEvent('Network error'), { status: 0, statusText: 'Unknown Error' });
      await pending;

      expect(component.error()).toContain('error inesperado');
    });
  });
});
