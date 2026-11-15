import { agruparParticulares, aplanarParticulares, bloquesTexto } from './condiciones';

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

describe('agruparParticulares', () => {
  it('muestra una fila por cobertura sin perder sus campos ni las demás condiciones', () => {
    const filas = agruparParticulares(
      {
        plazo_meses: 12,
        coberturas: [
          {
            nombre: 'Hospitalización',
            codigo: 'HOSP',
            prima: '50000',
            limite_asegurado: '1000000',
            deducible: '10000',
            condiciones: { red: 'Nacional', vigente: true, nombre: 'Red principal' },
          },
          { nombre: 'Equipaje', prima: '9000', deducible: '0' },
          { cobertura_id: 'sin-nombre', nota: null },
        ],
        destino: 'Europa',
      },
      '',
      'COP',
    );
    expect(filas).toHaveLength(5);
    expect(filas[0]).toEqual({ etiqueta: 'Plazo meses', valor: '12' });
    expect(filas[1].etiqueta).toBe('Hospitalización');
    expect(filas[1].valor).toMatch(/Codigo: HOSP/);
    expect(filas[1].valor).toMatch(/Prima: [^·]*50\.000/);
    expect(filas[1].valor).toMatch(/Límite asegurado: [^\n]*1\.000\.000/);
    expect(filas[1].valor).toMatch(/Deducible: [^·]*10\.000/);
    expect(filas[1].valor).toContain('Condiciones · Red: Nacional');
    expect(filas[1].valor).toContain('Condiciones · Vigente: Sí');
    expect(filas[1].valor).toContain('Condiciones · Nombre: Red principal');
    expect(filas[2].etiqueta).toBe('Equipaje');
    expect(filas[1].campos?.map((campo) => campo.etiqueta)).toEqual([
      'Prima',
      'Límite asegurado',
      'Deducible',
      'Codigo',
      'Condiciones · Red',
      'Condiciones · Vigente',
      'Condiciones · Nombre',
    ]);
    expect(filas[1].valor).not.toContain('Nombre: Hospitalización');
    expect(filas[3].etiqueta).toBe('Cobertura 3');
    expect(filas[3].valor).toContain('Cobertura id: sin-nombre\nNota: —');
    expect(filas[4]).toEqual({ etiqueta: 'Destino', valor: 'Europa' });
  });

  it('conserva coberturas anidadas, valores simples, claves de mapas y listas vacías', () => {
    expect(
      agruparParticulares({
        detalle: { coberturas: ['Incendio', null] },
        otras: { coberturas: { codigo_a: { nombre: 'Daños', prima: '10' } } },
        vacio: { coberturas: [] },
      }),
    ).toEqual([
      { etiqueta: 'Detalle · Cobertura 1', valor: 'Incendio' },
      { etiqueta: 'Detalle · Cobertura 2', valor: '—' },
      {
        etiqueta: 'Otras · Coberturas · Codigo a · Daños',
        valor: expect.stringMatching(/^Prima: /),
        campos: expect.arrayContaining([
          { etiqueta: 'Límite asegurado', valor: '—' },
          { etiqueta: 'Deducible', valor: '—' },
        ]),
      },
      { etiqueta: 'Vacio · Coberturas', valor: '—' },
    ]);
  });

  it('omite las variantes del nombre en los campos de coberturas', () => {
    const filas = agruparParticulares({
      coberturas: [
        { nombre_cobertura: 'Asistencia', prima: 10 },
        { nombre: null, prima: 20 },
      ],
    });

    expect(filas[0].etiqueta).toBe('Asistencia');
    expect(filas[1].etiqueta).toBe('Cobertura 2');
    for (const fila of filas) {
      expect(fila.campos?.map((campo) => campo.etiqueta)).toEqual([
        'Prima',
        'Límite asegurado',
        'Deducible',
      ]);
    }
  });

  it('agrupa las fechas de vigencia en una sola entrada y conserva el resto', () => {
    expect(
      agruparParticulares({
        vigencia_hasta: '2027-11-10T00:00:00Z',
        prima_total: '100',
        vigencia_desde: '2026-11-10T18:45:00Z',
        otro: 'dato',
      }),
    ).toEqual([
      { etiqueta: 'Vigencia', valor: '10/11/2026 – 10/11/2027', vigencia: true },
      { etiqueta: 'Prima total', valor: expect.stringMatching(/100/) },
      { etiqueta: 'Otro', valor: 'dato' },
    ]);
  });

  it('agrupa fechas anidadas y conserva valores incompletos sin inventar fechas', () => {
    expect(
      agruparParticulares({
        detalle: { vigencia: { desde: '2026-01-02', hasta: '2027-02-03', meses: 13 } },
        incompleto: { vigencia_desde: '2026-03-04' },
      }),
    ).toEqual([
      { etiqueta: 'Detalle · Vigencia', valor: '02/01/2026 – 03/02/2027', vigencia: true },
      { etiqueta: 'Detalle · Vigencia · Meses', valor: '13' },
      { etiqueta: 'Incompleto · Vigencia desde', valor: '04/03/2026' },
    ]);
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
