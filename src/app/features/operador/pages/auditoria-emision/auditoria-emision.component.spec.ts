import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuditoriaEmisionComponent } from './auditoria-emision.component';

const URL = '/api/v1/bff-web/auditoria-emision';

const EVENTOS = [
  ['CONDICIONES_ACEPTADAS', '2026-11-13T12:00:00Z', 'ACEPTADA'],
  ['KYC_AML_RESULTADO', '2026-11-13T13:00:00Z', 'APROBADA'],
  ['PAGO_RESULTADO', '2026-11-13T14:00:00Z', 'APROBADO'],
  ['FIRMA_CAPTURADA', '2026-11-13T14:30:00Z', 'CAPTURADA'],
  ['FIRMA_VINCULADA', '2026-11-13T14:45:00Z', 'VINCULADA'],
  ['POLIZA_EMITIDA', '2026-11-13T15:00:00Z', 'EMITIDA'],
].map(([tipo, ocurrido_en, resultado], index) => ({
  evento_id: `00000000-0000-0000-0000-00000000000${index + 1}`,
  cotizacion_id: 'quote-1',
  cliente_id: 'client-1',
  tipo,
  ocurrido_en,
  origen: 'sistema',
  actor_id: null,
  resultado,
  referencia_id: `source-${index}`,
  correlation_id: 'corr-1',
  detalles: {},
}));

describe('AuditoriaEmisionComponent', () => {
  let fixture: ComponentFixture<AuditoriaEmisionComponent>;
  let httpMock: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const boton = () => el().querySelector('button[type="submit"]') as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditoriaEmisionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { token: 'token-auditor' } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AuditoriaEmisionComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('busca por número de póliza y muestra los 6 eventos en orden cronológico', async () => {
    const input = el().querySelector('input') as HTMLInputElement;
    input.value = 'POL-20261113-AB12CD34';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    boton().click();

    const request = httpMock.expectOne((r) => r.url === URL);
    expect(request.request.params.get('numero_poliza')).toBe('POL-20261113-AB12CD34');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-auditor');
    request.flush({
      poliza_id: 'poliza-1',
      numero: 'POL-20261113-AB12CD34',
      cotizacion_id: 'quote-1',
      cliente_id: 'client-1',
      eventos: EVENTOS,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const filas = Array.from(el().querySelectorAll('tbody tr'));
    expect(filas).toHaveLength(6);
    expect(filas[0].textContent).toContain('Aceptación de condiciones');
    expect(filas[5].textContent).toContain('Emisión de póliza');
    expect(el().textContent).toContain('POL-20261113-AB12CD34');
  });

  it('informa cuando el usuario autenticado no tiene rol auditor', async () => {
    const input = el().querySelector('input') as HTMLInputElement;
    input.value = 'POL-20261113-AB12CD34';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    boton().click();
    httpMock
      .expectOne((request) => request.url === URL)
      .flush(
        { detail: 'Acceso exclusivo para auditores.' },
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('auditor');
  });

  it('es una consulta de solo lectura', () => {
    expect(Array.from(el().querySelectorAll('button')).map((b) => b.textContent?.trim())).toEqual([
      'Consultar trazabilidad',
    ]);
  });
});
