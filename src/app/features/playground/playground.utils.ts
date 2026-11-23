import { PREFIJO_SOCIOS, PREFIJO_WEB } from './playground.catalog';
import { EdicionPaso, PasoPlayground, Peticion } from './playground.models';

export type Contexto = Record<string, string>;

export interface VistaPaso {
  url: string;
  headers: string;
  body: string | null;
  path: Record<string, string>;
}

const MARCADOR = /\{\{(\w+)\}\}/g;

function bytesAleatorios(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** UUID v4 con getRandomValues: `crypto.randomUUID` no existe en contextos HTTP no seguros. */
export function uuid(): string {
  const b = bytesAleatorios(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Valores únicos por corrida para que los datos de ejemplo no choquen con corridas anteriores. */
export function semillas(): Contexto {
  const digitos = new DataView(bytesAleatorios(4).buffer).getUint32(0) % 9_000_000_000;
  return {
    run_id: uuid().replaceAll('-', ''),
    correlation_id: uuid(),
    numero_identificacion: String(1_000_000_000 + digitos),
  };
}

export function resolver(plantilla: string, ctx: Contexto): string {
  return plantilla.replace(MARCADOR, (marcador, nombre: string) => ctx[nombre] ?? marcador);
}

function faltantes(...textos: string[]): string[] {
  const nombres = textos.flatMap((t) => Array.from(t.matchAll(MARCADOR), (m) => m[1]));
  return [...new Set(nombres)];
}

function construirUrl(
  paso: PasoPlayground,
  path: Record<string, string>,
  codificar: boolean,
): string {
  const ruta = paso.ruta.replace(/\{(\w+)\}/g, (_, nombre: string) => {
    const valor = path[nombre] ?? `{{${nombre}}}`;
    return codificar ? encodeURIComponent(valor) : valor;
  });
  const prefijo = paso.servicio === 'web' ? PREFIJO_WEB : PREFIJO_SOCIOS;
  return globalThis.location.origin + prefijo + ruta;
}

function valoresPath(paso: PasoPlayground, ctx: Contexto, edicion?: EdicionPaso) {
  return Object.fromEntries(
    Object.entries(paso.path ?? {}).map(([nombre, plantilla]) => [
      nombre,
      edicion?.path?.[nombre] ?? resolver(plantilla, ctx),
    ]),
  );
}

/** Lo que se muestra en pantalla: lo editado por la persona o, si no, la plantilla con el contexto. */
export function vista(
  paso: PasoPlayground,
  ctx: Contexto,
  edicion: EdicionPaso | undefined,
): VistaPaso {
  const path = valoresPath(paso, ctx, edicion);
  const headers = Object.fromEntries(
    Object.entries(paso.headers).map(([k, v]) => [k, resolver(v, ctx)]),
  );
  return {
    url: construirUrl(paso, path, false),
    headers: edicion?.headers ?? JSON.stringify(headers, null, 2),
    body: paso.body === undefined ? null : (edicion?.body ?? resolver(paso.body, ctx)),
    path,
  };
}

function parsear(texto: string, etiqueta: string, errores: string[]): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    errores.push(`${etiqueta}: el JSON no es válido.`);
    return undefined;
  }
}

/** Valida lo que se ve en pantalla y lo convierte en la petición HTTP a enviar. */
export function preparar(
  paso: PasoPlayground,
  ctx: Contexto,
  edicion: EdicionPaso | undefined,
): { peticion?: Peticion; errores: string[] } {
  const v = vista(paso, ctx, edicion);
  const headersTexto = resolver(v.headers, ctx);
  const bodyTexto = v.body === null ? null : resolver(v.body, ctx);
  const pathResuelto = Object.fromEntries(
    Object.entries(v.path).map(([k, valor]) => [k, resolver(valor, ctx)]),
  );

  const errores = faltantes(...Object.values(pathResuelto), headersTexto, bodyTexto ?? '').map(
    (nombre) => `Falta el valor de «${nombre}»: ejecuta antes el paso que lo genera o escríbelo.`,
  );
  const headers = parsear(headersTexto, 'Headers', errores);
  const body = bodyTexto === null ? undefined : parsear(bodyTexto, 'Payload', errores);
  if (headers !== undefined && (typeof headers !== 'object' || headers === null)) {
    errores.push('Headers: debe ser un objeto JSON.');
  }
  if (paso.archivos && body !== undefined && (typeof body !== 'object' || body === null)) {
    errores.push('Payload: debe ser un objeto JSON con los campos del formulario.');
  }
  if (errores.length > 0) return { errores };

  const peticion: Peticion = {
    metodo: paso.metodo,
    url: construirUrl(paso, pathResuelto, true),
    headers: headers as Record<string, string>,
    binario: paso.binario ?? false,
  };
  if (paso.archivos) {
    peticion.formulario = {
      campos: Object.fromEntries(
        Object.entries((body ?? {}) as Record<string, unknown>).map(([k, valor]) => [
          k,
          String(valor),
        ]),
      ),
      archivos: paso.archivos.map((a) => ({
        campo: a.campo,
        nombre: a.nombre,
        tipo: a.tipo,
        contenido: a.generar(),
      })),
    };
  } else if (body !== undefined) {
    peticion.json = body;
  }
  return { peticion, errores };
}
