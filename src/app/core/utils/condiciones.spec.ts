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
});
