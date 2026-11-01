import { ParametroSeguro } from '../models/cotizacion';

export type TipoControl = 'numero' | 'fecha' | 'booleano' | 'texto';

/** Traduce el `tipo` libre que declara el producto al control de formulario que lo captura. */
export function tipoControl(tipo: string): TipoControl {
  const t = tipo.toLowerCase();
  if (/bool/.test(t)) return 'booleano';
  if (/date|fecha/.test(t)) return 'fecha';
  if (/int|num|dec|float|double|entero|monto|money/.test(t)) return 'numero';
  return 'texto';
}

/** Convierte el valor capturado al tipo JSON que espera el contrato; `null` si no se informó. */
export function valorParametro(
  p: ParametroSeguro,
  crudo: unknown,
): string | number | boolean | null {
  const control = tipoControl(p.tipo);
  if (control === 'booleano') {
    return crudo === true;
  }
  if (crudo === null || crudo === undefined || String(crudo).trim() === '') {
    return null;
  }
  return control === 'numero' ? Number(crudo) : String(crudo).trim();
}

export function formatearMonto(valor: string | number, moneda: string): string {
  const n = Number(valor);
  if (!Number.isFinite(n)) {
    return String(valor);
  }
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toLocaleString('es-CO')} ${moneda}`;
  }
}
