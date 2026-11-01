import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Cotizacion } from '../../../../../core/models/cotizacion';
import { CotizacionService } from '../../../../../core/services/cotizacion.service';
import { CotizacionComponent } from './cotizacion.component';

const COTIZACION: Cotizacion = {
  cotizacion_id: 'q-1',
  cliente_id: 'cli-1',
  producto_codigo: 'VIAJE',
  estado: 'VIGENTE',
  moneda: 'COP',
  prima_base: '50000.00',
  ajustes: [{ concepto: 'Destino', tipo: 'recargo', valor: '5000.00', motivo: 'Europa' }],
  impuestos: [{ concepto: 'IVA', tasa: '19%', valor: '10450.00' }],
  prima_total: '65450.00',
  degradada: true,
  motivos_degradacion: ['Sin score crediticio'],
  coberturas: [
    {
      cobertura_id: 'c-1',
      codigo: 'MED',
      nombre: 'Gastos médicos',
      prima: '34000.00',
      limite_asegurado: '100000000.00',
      deducible: '0.00',
    },
  ],
  expira_en: '2026-10-30T10:00:00Z',
  creada_en: '2026-10-25T10:00:00Z',
};

describe('CotizacionComponent', () => {
  async function setup(cotizacion: Cotizacion | null) {
    await TestBed.configureTestingModule({
      imports: [CotizacionComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    TestBed.inject(CotizacionService).ultima.set(cotizacion);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CotizacionComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return { el: fixture.nativeElement as HTMLElement, nav };
  }

  it('muestra prima total, desglose, coberturas y motivos de degradación', async () => {
    const { el } = await setup(COTIZACION);

    expect(el.querySelector('[data-testid="prima-total"]')?.textContent).toMatch(/65\.450/);
    expect(el.textContent).toContain('Prima base');
    expect(el.textContent).toContain('Destino');
    expect(el.textContent).toContain('IVA');
    expect(el.textContent).toContain('Tasa 19%');
    expect(el.textContent).toContain('Gastos médicos');
    expect(el.querySelector('[data-testid="degradada"]')?.textContent).toContain(
      'Sin score crediticio',
    );
    expect(el.querySelector('a[href="/cliente/adquirir/VIAJE/cotizar"]')).not.toBeNull();
  });

  it('vuelve al catálogo si no hay cotización en memoria', async () => {
    const { nav } = await setup(null);

    expect(nav).toHaveBeenCalledWith('/cliente/adquirir');
  });
});
