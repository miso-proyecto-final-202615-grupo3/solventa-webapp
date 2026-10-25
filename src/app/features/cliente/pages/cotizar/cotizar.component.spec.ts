import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuditoriaConsentimientoService } from '../../../../core/services/auditoria-consentimiento.service';
import { CotizacionService } from '../../../../core/services/cotizacion.service';
import { ProductoCotizacion } from '../../../../core/models/cotizacion';
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
  cliente_id: AUDITORIA.cliente.id,
  producto_codigo: 'VIDA_HIPOTECARIO' as const,
  estado: 'EMITIDA',
  moneda: 'COP' as const,
  prima_base: 50000,
  prima_neta: 40375,
  ajustes: [
    {
      concepto: 'OPEN_FINANCE',
      tipo: 'DEDUCCION' as const,
      valor: 7500,
      motivo: 'Descuento Open Finance',
    },
    {
      concepto: 'OPEN_DATA',
      tipo: 'DEDUCCION' as const,
      valor: 2125,
      motivo: 'Descuento Open Data',
    },
  ],
  impuestos: [{ concepto: 'IVA', tasa: 0.19, valor: 7671.25 }],
  prima_total: 48046.25,
  degradada: false,
  motivos_degradacion: [],
  coberturas: [],
  expira_en: '2026-10-26T12:00:00Z',
  creada_en: '2026-10-25T12:00:00Z',
};

const PRODUCTO: ProductoCotizacion = {
  producto_id: 'a92f99ee-a0e1-4ff2-9110-ed42e0c2ce92',
  codigo: 'VIDA_HIPOTECARIO',
  nombre: 'Seguro de vida hipotecario',
  ramo: 'VIDA',
  pais: 'CO',
  estado: 'ACTIVO',
  moneda: 'COP',
  mensaje_legal: 'La cotización es informativa.',
  fuentes_datos: ['OPEN_FINANCE', 'OPEN_DATA'],
  parametros: [],
  coberturas: [
    {
      cobertura_id: 'b0bfc70a-3332-44db-9838-88888e2701de',
      codigo: 'FALLECIMIENTO',
      nombre: 'Fallecimiento del asegurado',
      limite_asegurado: 2000000000,
      deducible: 0,
    },
  ],
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
    const cotizaciones = {
      obtenerProducto: vi.fn(() => of(PRODUCTO)),
      cotizar: vi.fn(() => of(COTIZACION)),
    };

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
    await new Promise((resolve) => setTimeout(resolve, 0));
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
      producto_codigo: 'VIDA_HIPOTECARIO',
      parametros: {
        saldo_credito: 200000000,
        ubicacion: { municipio: 'Bogotá D.C.', zona: 'URBANA', estrato: 4 },
      },
    });
    expect(fixture.nativeElement.textContent).toContain('48.046,25');
    expect(fixture.nativeElement.textContent).toContain('Descuento Open Finance');
    expect(fixture.nativeElement.textContent).toContain('Seguro de vida hipotecario');
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
