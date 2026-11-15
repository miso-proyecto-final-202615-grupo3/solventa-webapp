import { formatearMonto } from './parametros';

export type BloqueTexto =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'lista'; items: string[] };

export interface CampoParticular {
  etiqueta: string;
  valor: string;
}

export interface EntradaParticular extends CampoParticular {
  campos?: CampoParticular[];
  vigencia?: boolean;
}

const VINETA = /^\s*(?:[-*•]|\d+[.)])\s+/;
const TITULO_MARKDOWN = /^#{1,6}\s+/;
/** Línea corta en mayúsculas o con numeración tipo "1. DEFINICIONES" / "Cláusula 3". */
const TITULO_NUMERADO = /^(?:\d+(?:\.\d+)*[.)]?\s+)?[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ,.:;()/-]{3,}$/;

function esTitulo(linea: string): boolean {
  return TITULO_MARKDOWN.test(linea) || (linea.length <= 90 && TITULO_NUMERADO.test(linea));
}

/** Convierte texto plano o markdown ligero en bloques que se pintan sin innerHTML. */
export function bloquesTexto(texto: string): BloqueTexto[] {
  const bloques: BloqueTexto[] = [];
  const grupos = texto.replace(/\r\n?/g, '\n').split(/\n\s*\n/);
  for (const grupo of grupos) {
    const lineas = grupo
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.trim() !== '');
    let items: string[] = [];
    let parrafo: string[] = [];
    const cerrarLista = () => {
      if (items.length > 0) bloques.push({ tipo: 'lista', items });
      items = [];
    };
    const cerrarParrafo = () => {
      if (parrafo.length > 0) bloques.push({ tipo: 'parrafo', texto: parrafo.join('\n') });
      parrafo = [];
    };
    for (const linea of lineas) {
      const limpia = linea.trim();
      if (VINETA.test(limpia) && !esTitulo(limpia)) {
        cerrarParrafo();
        items.push(limpia.replace(VINETA, ''));
      } else if (esTitulo(limpia)) {
        cerrarLista();
        cerrarParrafo();
        bloques.push({ tipo: 'titulo', texto: limpia.replace(TITULO_MARKDOWN, '') });
      } else {
        cerrarLista();
        parrafo.push(limpia);
      }
    }
    cerrarLista();
    cerrarParrafo();
  }
  return bloques;
}

function etiquetar(clave: string): string {
  const texto = clave.replace(/[_-]+/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function normalizarClave(clave: string): string {
  return clave
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();
}

function esMonto(clave: string): boolean {
  const normalizada = normalizarClave(clave);
  return /\b(prima|limite asegurado|deducible)\b/.test(normalizada);
}

function esVigencia(clave: string): boolean {
  const normalizada = normalizarClave(clave);
  return /\bvigencia\b/.test(normalizada) && /\b(desde|hasta)\b/.test(normalizada);
}

function formatearFecha(valor: string): string {
  const fecha = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!fecha) return valor;
  return `${fecha[3]}/${fecha[2]}/${fecha[1]}`;
}

function formatearPrimitivo(valor: unknown, etiqueta: string, moneda: string): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (esMonto(etiqueta) && (typeof valor === 'number' || typeof valor === 'string')) {
    return formatearMonto(valor, moneda);
  }
  if (esVigencia(etiqueta) && typeof valor === 'string') {
    return formatearFecha(valor);
  }
  return String(valor);
}

/** Aplana el objeto libre de condiciones particulares a pares etiqueta/valor legibles. */
export function aplanarParticulares(
  datos: Record<string, unknown>,
  prefijo = '',
  moneda = 'COP',
): EntradaParticular[] {
  const entradas: EntradaParticular[] = [];
  for (const [clave, valor] of Object.entries(datos ?? {})) {
    const etiqueta = prefijo ? `${prefijo} · ${etiquetar(clave)}` : etiquetar(clave);
    if (Array.isArray(valor)) {
      if (valor.every((v) => v === null || typeof v !== 'object')) {
        entradas.push({
          etiqueta,
          valor: valor.map((v) => formatearPrimitivo(v, etiqueta, moneda)).join(', ') || '—',
        });
      } else {
        valor.forEach((v, i) => {
          if (v !== null && typeof v === 'object') {
            entradas.push(
              ...aplanarParticulares(v as Record<string, unknown>, `${etiqueta} ${i + 1}`, moneda),
            );
          } else {
            entradas.push({
              etiqueta: `${etiqueta} ${i + 1}`,
              valor: formatearPrimitivo(v, etiqueta, moneda),
            });
          }
        });
      }
    } else if (valor !== null && typeof valor === 'object') {
      entradas.push(...aplanarParticulares(valor as Record<string, unknown>, etiqueta, moneda));
    } else {
      entradas.push({ etiqueta, valor: formatearPrimitivo(valor, etiqueta, moneda) });
    }
  }
  return entradas;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function lineaCobertura(
  valor: unknown,
  etiqueta: string,
  moneda: string,
  usarNombre: boolean,
): EntradaParticular {
  if (!esObjeto(valor)) {
    return { etiqueta, valor: formatearPrimitivo(valor, etiqueta, moneda) };
  }
  const campos = { ...valor };
  const claveNombre = Object.keys(campos).find(
    (clave) =>
      ['nombre', 'nombre cobertura'].includes(normalizarClave(clave)) &&
      typeof campos[clave] === 'string' &&
      campos[clave].trim() !== '',
  );
  if (claveNombre) {
    etiqueta = usarNombre ? String(campos[claveNombre]) : `${etiqueta} · ${campos[claveNombre]}`;
  }
  const detalles = aplanarParticulares(campos, '', moneda).filter(
    (detalle) => !['nombre', 'nombre cobertura'].includes(normalizarClave(detalle.etiqueta)),
  );
  const prioritarios = [
    { etiqueta: 'Prima', claves: ['prima'] },
    { etiqueta: 'Límite asegurado', claves: ['limite asegurado'] },
    { etiqueta: 'Deducible', claves: ['deducible'] },
  ];
  const usados = new Set<number>();
  const lineas: CampoParticular[] = prioritarios.map((campo) => {
    const indice = detalles.findIndex(
      (detalle, i) => !usados.has(i) && campo.claves.includes(normalizarClave(detalle.etiqueta)),
    );
    if (indice < 0) return { etiqueta: campo.etiqueta, valor: '—' };
    usados.add(indice);
    return { etiqueta: campo.etiqueta, valor: detalles[indice].valor };
  });
  lineas.push(...detalles.filter((_, indice) => !usados.has(indice)));
  return {
    etiqueta,
    valor: lineas.map((campo) => `${campo.etiqueta}: ${campo.valor}`).join('\n'),
    campos: lineas,
  };
}

/** Agrupa cada cobertura en una fila y conserva los demás datos del objeto libre. */
export function agruparParticulares(
  datos: Record<string, unknown>,
  prefijo = '',
  moneda = 'COP',
): EntradaParticular[] {
  const entradas: EntradaParticular[] = [];
  const claves = Object.keys(datos);
  const dentroDeVigencia = normalizarClave(prefijo.split(' · ').at(-1) ?? '') === 'vigencia';
  const inicio = claves.find((clave) =>
    (dentroDeVigencia ? ['desde', 'inicio'] : ['vigencia desde', 'vigencia inicio']).includes(
      normalizarClave(clave),
    ),
  );
  const fin = claves.find((clave) =>
    (dentroDeVigencia ? ['hasta', 'fin'] : ['vigencia hasta', 'vigencia fin']).includes(
      normalizarClave(clave),
    ),
  );
  let vigenciaMostrada = false;
  for (const [clave, valor] of Object.entries(datos)) {
    const etiqueta = prefijo ? `${prefijo} · ${etiquetar(clave)}` : etiquetar(clave);
    if (
      inicio &&
      fin &&
      !esObjeto(datos[inicio]) &&
      !esObjeto(datos[fin]) &&
      !Array.isArray(datos[inicio]) &&
      !Array.isArray(datos[fin]) &&
      (clave === inicio || clave === fin)
    ) {
      if (!vigenciaMostrada) {
        const etiquetaVigencia = dentroDeVigencia
          ? prefijo
          : prefijo
            ? `${prefijo} · Vigencia`
            : 'Vigencia';
        entradas.push({
          etiqueta: etiquetaVigencia,
          valor: `${formatearPrimitivo(datos[inicio], `${etiquetaVigencia} Desde`, moneda)} – ${formatearPrimitivo(datos[fin], `${etiquetaVigencia} Hasta`, moneda)}`,
          vigencia: true,
        });
        vigenciaMostrada = true;
      }
      continue;
    }
    if (normalizarClave(clave) === 'coberturas' && Array.isArray(valor) && valor.length) {
      valor.forEach((cobertura, indice) => {
        const fila = lineaCobertura(cobertura, `Cobertura ${indice + 1}`, moneda, true);
        entradas.push({
          ...fila,
          etiqueta: prefijo ? `${prefijo} · ${fila.etiqueta}` : fila.etiqueta,
        });
      });
    } else if (
      normalizarClave(clave) === 'coberturas' &&
      esObjeto(valor) &&
      Object.keys(valor).length
    ) {
      const lista = Object.entries(valor);
      if (lista.every(([, cobertura]) => esObjeto(cobertura))) {
        for (const [nombre, cobertura] of lista) {
          entradas.push(
            lineaCobertura(cobertura, `${etiqueta} · ${etiquetar(nombre)}`, moneda, false),
          );
        }
      } else {
        const fila = lineaCobertura(valor, etiqueta, moneda, true);
        entradas.push({
          ...fila,
          etiqueta:
            prefijo && fila.etiqueta !== etiqueta ? `${prefijo} · ${fila.etiqueta}` : fila.etiqueta,
        });
      }
    } else if (esObjeto(valor)) {
      entradas.push(...agruparParticulares(valor, etiqueta, moneda));
    } else {
      entradas.push(...aplanarParticulares({ [clave]: valor }, prefijo, moneda));
    }
  }
  return entradas;
}
