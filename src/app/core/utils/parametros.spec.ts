import { ParametroSeguro } from '../models/cotizacion';
import { formatearMonto, tipoControl, valorParametro } from './parametros';

const param = (tipo: string): ParametroSeguro => ({ nombre: 'x', etiqueta: 'X', tipo });

describe('parametros', () => {
  it.each([
    ['integer', 'numero'],
    ['decimal', 'numero'],
    ['number', 'numero'],
    ['date', 'fecha'],
    ['fecha', 'fecha'],
    ['boolean', 'booleano'],
    ['string', 'texto'],
  ])('tipo %s se captura como %s', (tipo, esperado) => {
    expect(tipoControl(tipo)).toBe(esperado);
  });

  it('convierte el valor capturado al tipo del contrato', () => {
    expect(valorParametro(param('integer'), '14')).toBe(14);
    expect(valorParametro(param('string'), ' hola ')).toBe('hola');
    expect(valorParametro(param('boolean'), true)).toBe(true);
    expect(valorParametro(param('boolean'), '')).toBe(false);
    expect(valorParametro(param('string'), '')).toBeNull();
    expect(valorParametro(param('integer'), null)).toBeNull();
  });

  it('formatea montos y conserva el texto si no es numérico', () => {
    expect(formatearMonto('52000', 'COP')).toMatch(/52\.000/);
    expect(formatearMonto('n/a', 'COP')).toBe('n/a');
  });
});
