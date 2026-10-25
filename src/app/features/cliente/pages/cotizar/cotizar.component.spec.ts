import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuditoriaConsentimientoService } from '../../../../core/services/auditoria-consentimiento.service';
import { CotizacionService } from '../../../../core/services/cotizacion.service';
import { CotizarComponent } from './cotizar.component';

const AUDITORIA = {
  cliente: {
    id: 'c8cff57a-ff9b-444d-a4df-907c4ba2a83a',
    nombres: 'Ana',
    apellidos: 'Pérez',
    tipo_documento: 'CC',
    numero_identificacion: '1020304050',
    correo: 'ana@example.com',
    estado_consentimiento: 'ACEPTADO' as const,
  },
  eventos: [],
};

const COTIZACION = {
  cotizacion_id: '3fb58ca8-f52b-4690-a645-71cde63f03be',
  estado: 'COTIZADA' as const,
  ramo: 'VIDA_HIPOTECARIO' as const,
  moneda: 'COP' as const,
  prima_mensual: 48046.25,
  desglose: {
    prima_base: 50000,
    ajustes: -9625,
    prima_neta: 40375,
    impuestos: 7671.25,
  },
  explicacion_ajustes: ['Descuento Open Finance', 'Descuento Open Data'],
  fuente_perfil: 'PROVEEDORES' as const,
  vigencia_hasta: '2026-10-25T12:00:00Z',
};

describe('CotizarComponent', () => {
  async function setup(consentimiento = 'ACEPTADO') {
    const auditoria = {
      consultar: vi.fn(() =>
        of({
          ...AUDITORIA,
          cliente: { ...AUDITORIA.cliente, estado_consentimiento: consentimiento },
        }),
      ),
    };
    const cotizaciones = { cotizar: vi.fn(() => of(COTIZACION)) };

    await TestBed.configureTestingModule({
      imports: [CotizarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { email: 'ana@example.com' } },
        { provide: AuditoriaConsentimientoService, useValue: auditoria },
        { provide: CotizacionService, useValue: cotizaciones },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CotizarComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, auditoria, cotizaciones };
  }

  it('genera y presenta la prima mensual y su desglose', async () => {
    const { fixture, auditoria, cotizaciones } = await setup();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(auditoria.consultar).toHaveBeenCalledWith('correo', 'ana@example.com');
    expect(cotizaciones.cotizar).toHaveBeenCalledWith({
      cliente_id: AUDITORIA.cliente.id,
      ramo: 'VIDA_HIPOTECARIO',
      consentimiento_version: '1.0',
      parametros: {
        saldo_credito: 200000000,
        ubicacion: { municipio: 'Bogotá D.C.', zona: 'URBANA', estrato: 4 },
      },
    });
    expect(fixture.nativeElement.textContent).toContain('48.046,25');
    expect(fixture.nativeElement.textContent).toContain('Descuento Open Finance');
  });

  it('bloquea la cotización y ofrece gestionar consentimiento revocado', async () => {
    const { fixture, cotizaciones } = await setup('REVOCADO');
    const button = fixture.nativeElement.querySelector('button[type="submit"]');

    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('a[href="/cliente/perfil"]')).not.toBeNull();
    expect(cotizaciones.cotizar).not.toHaveBeenCalled();
  });

  it('explica cuando la API devuelve consentimiento inactivo', async () => {
    const { fixture, cotizaciones } = await setup();
    cotizaciones.cotizar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' })),
    );

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tu consentimiento no está activo');
    expect(fixture.nativeElement.querySelector('a[href="/cliente/perfil"]')).not.toBeNull();
  });
});
