import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { SociosListadoComponent } from './socios-listado.component';

const URL = '/api/v1/bff-web/socios';

describe('SociosListadoComponent', () => {
  let fixture: ComponentFixture<SociosListadoComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SociosListadoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: 'token-socios-admin' } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SociosListadoComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne(URL).flush([
      {
        id: 'socio-activo',
        nombre: 'Banco Andino',
        correo: 'banco@example.com',
        tipo_socio: 'Banco',
        canal_integracion: 'API',
        estado: 'ACTIVO',
        creado_en: '2026-11-18T00:00:00Z',
      },
      {
        id: 'socio-pendiente',
        nombre: 'Fintech Norte',
        correo: 'fintech@example.com',
        tipo_socio: 'Fintech',
        canal_integracion: 'API',
        estado: 'PENDIENTE',
        creado_en: '2026-11-18T00:00:00Z',
      },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('habilita credenciales solo para socios activos', () => {
    const element = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(
      element.querySelectorAll('.socios-listado__credencial'),
    ) as HTMLButtonElement[];

    expect(buttons).toHaveLength(2);
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
  });

  it('muestra el secreto una sola vez después de generarlo', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector('.socios-listado__credencial') as HTMLButtonElement;
    button.click();
    const request = httpMock.expectOne(`${URL}/socio-activo/api-keys`);
    expect(request.request.method).toBe('POST');
    request.flush({
      api_key_id: 'key-1',
      api_key: 'secret-value',
      fecha_generacion: '2026-11-18T00:00:00Z',
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('secret-value');
    expect(fixture.nativeElement.textContent).toContain('Guarda el secreto ahora');
  });
});
