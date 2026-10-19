import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PerfilComponent } from './perfil.component';

const GET = (r: { url: string; params: { get(k: string): string | null } }) =>
  r.url === '/api/v1/bff-web/consentimientos' && r.params.get('correo') === 'ana@correo.com';

function auditoria(estado: 'ACEPTADO' | 'REVOCADO' | null) {
  return {
    cliente: {
      id: 'cli-1',
      nombres: 'Ana',
      apellidos: 'Pérez',
      tipo_documento: 'CC',
      numero_identificacion: '1020304050',
      correo: 'ana@correo.com',
      estado_consentimiento: estado,
    },
    eventos: [
      {
        id: 'e1',
        tipo_accion: 'ACEPTACION',
        fecha: '2026-10-18T10:00:00Z',
        version_terminos: '1.0',
        canal: 'web',
      },
    ],
  };
}

describe('PerfilComponent', () => {
  async function setup(conCorreo = true) {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    if (conCorreo) {
      sessionStorage.setItem(
        'solventa.auth',
        JSON.stringify({ token: 't', email: 'ana@correo.com' }),
      );
    }
    const fixture = TestBed.createComponent(PerfilComponent);
    fixture.detectChanges();
    return {
      fixture,
      el: fixture.nativeElement as HTMLElement,
      http: TestBed.inject(HttpTestingController),
    };
  }

  it('muestra el estado vigente y el historial del cliente de la sesión', async () => {
    const { fixture, el, http } = await setup();
    http.expectOne(GET).flush(auditoria('ACEPTADO'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="estado"]')?.textContent).toContain('ACEPTADO');
    expect(el.textContent).toContain('Aceptación');
    expect(el.textContent).toContain('Revocar consentimiento');
  });

  it('revoca tras confirmar y recarga el estado', async () => {
    const { fixture, el, http } = await setup();
    http.expectOne(GET).flush(auditoria('ACEPTADO'));
    await fixture.whenStable();
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('¿Revocar tu consentimiento?');

    el.querySelector<HTMLButtonElement>('.perfil__btn--danger')!.click();
    const put = http.expectOne('/api/v1/bff-web/clientes/cli-1/consentimiento');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ estado: 'REVOCADO' });
    put.flush({ cliente_id: 'cli-1', estado: 'REVOCADO', otorgado_en: null, revocado_en: 'x' });
    await fixture.whenStable();

    http.expectOne(GET).flush(auditoria('REVOCADO'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="estado"]')?.textContent).toContain('REVOCADO');
    expect(el.textContent).toContain('Aceptar consentimiento');
  });

  it('permite aceptar cuando está revocado', async () => {
    const { fixture, el, http } = await setup();
    http.expectOne(GET).flush(auditoria('REVOCADO'));
    await fixture.whenStable();
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button')!.click();
    const put = http.expectOne('/api/v1/bff-web/clientes/cli-1/consentimiento');
    expect(put.request.body).toEqual({ estado: 'ACEPTADO' });
  });

  it('muestra un mensaje si falla la carga', async () => {
    const { fixture, el, http } = await setup();
    http.expectOne(GET).flush({}, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('no disponible');
  });

  it('sin correo de sesión no consulta y pide iniciar sesión', async () => {
    const { fixture, el, http } = await setup(false);
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone(() => true);
    expect(el.textContent).toContain('Vuelve a iniciar sesión');
  });
});
