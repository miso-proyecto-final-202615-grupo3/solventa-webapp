import { aplanarParticulares, bloquesTexto } from './condiciones';

describe('bloquesTexto', () => {
  it('separa títulos, párrafos y listas', () => {
    const bloques = bloquesTexto(
      [
        '1. OBJETO DEL SEGURO',
        'Primera línea.',
        'Segunda línea.',
        '',
        '## Exclusiones',
        '- Guerra',
        '- Dolo',
        '',
        'Cierre final.',
      ].join('\n'),
    );

    expect(bloques).toEqual([
      { tipo: 'titulo', texto: '1. OBJETO DEL SEGURO' },
      { tipo: 'parrafo', texto: 'Primera línea.\nSegunda línea.' },
      { tipo: 'titulo', texto: 'Exclusiones' },
      { tipo: 'lista', items: ['Guerra', 'Dolo'] },
      { tipo: 'parrafo', texto: 'Cierre final.' },
    ]);
  });

  it('devuelve una lista vacía para texto vacío', () => {
    expect(bloquesTexto('')).toEqual([]);
  });
});

describe('aplanarParticulares', () => {
  it('aplana objetos, listas y valores primitivos', () => {
    const entradas = aplanarParticulares({
      plazo_meses: 12,
      renovable: true,
      beneficiarios: ['Ana', 'Luis'],
      cobertura: { limite: '1000', nota: null },
      detalle: [{ nombre: 'A' }],
    });

    expect(entradas).toEqual([
      { etiqueta: 'Plazo meses', valor: '12' },
      { etiqueta: 'Renovable', valor: 'Sí' },
      { etiqueta: 'Beneficiarios', valor: 'Ana, Luis' },
      { etiqueta: 'Cobertura · Limite', valor: '1000' },
      { etiqueta: 'Cobertura · Nota', valor: '—' },
      { etiqueta: 'Detalle 1 · Nombre', valor: 'A' },
    ]);
  });

  it('formatea montos de prima, límite y deducible con la moneda indicada', () => {
    const entradas = aplanarParticulares(
      {
        prima_total: 2500000,
        Condiciones: {
          Prima: '1250000',
          'Limite asegurado': 10000000,
          Deducible: 500000,
        },
      },
      '',
      'COP',
    );

    expect(entradas.map((entrada) => entrada.valor)).toEqual([
      expect.stringMatching(/2\.500\.000/),
      expect.stringMatching(/1\.250\.000/),
      expect.stringMatching(/10\.000\.000/),
      expect.stringMatching(/500\.000/),
    ]);
    expect(entradas.every((entrada) => /COP|\$/.test(entrada.valor))).toBe(true);
  });

  it('muestra las fechas de vigencia sin hora', () => {
    const entradas = aplanarParticulares({
      'Vigencia Desde': '2026-11-10T18:45:00Z',
      'Vigencia Hasta': '2027-11-10',
    });

    expect(entradas).toEqual([
      { etiqueta: 'Vigencia Desde', valor: '10/11/2026' },
      { etiqueta: 'Vigencia Hasta', valor: '10/11/2027' },
    ]);
  });
});
