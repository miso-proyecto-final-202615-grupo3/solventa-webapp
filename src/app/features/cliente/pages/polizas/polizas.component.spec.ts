import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PolizaService } from '../../../../core/services/poliza.service';
import { PolizasComponent } from './polizas.component';

describe('PolizasComponent', () => {
  it('muestra el estado vacío y no ofrece registrarse a un cliente autenticado', async () => {
    await TestBed.configureTestingModule({
      imports: [PolizasComponent],
      providers: [
        provideRouter([]),
        { provide: PolizaService, useValue: { listarMisPolizas: () => Promise.resolve([]) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PolizasComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('Pólizas de tu cuenta');
    expect(el.textContent).toContain('Aún no tienes pólizas activas');
    expect(el.querySelector('a[href="/registro"]')).toBeNull();
  });

  it('muestra la póliza y sus coberturas', async () => {
    await TestBed.configureTestingModule({
      imports: [PolizasComponent],
      providers: [
        {
          provide: PolizaService,
          useValue: {
            listarMisPolizas: () =>
              Promise.resolve([
                {
                  poliza_id: 'poliza-1',
                  cliente_id: 'cliente-1',
                  cotizacion_id: 'cotizacion-1',
                  producto_id: 'producto-1',
                  numero: 'POL-0001',
                  estado: 'EMITIDA',
                  vigencia_desde: '2026-01-01T00:00:00Z',
                  vigencia_hasta: '2027-01-01T00:00:00Z',
                  emitida_en: '2026-01-01T00:00:00Z',
                  ramo: 'VIAJE',
                  prima_total: '12000.50',
                  coberturas: [
                    {
                      cobertura_id: 'cobertura-1',
                      limite_asegurado: '1000000.00',
                      deducible: '0.00',
                      prima: '12000.50',
                    },
                  ],
                },
              ]),
          },
        },
        provideRouter([]),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PolizasComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('POL-0001');
    expect(el.textContent).toContain('EMITIDA');
  });
});
