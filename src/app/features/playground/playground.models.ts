export type Metodo = 'GET' | 'POST' | 'PUT';
export type Servicio = 'web' | 'socios';

export interface ArchivoPlantilla {
  campo: string;
  nombre: string;
  tipo: string;
  generar: () => Uint8Array<ArrayBuffer>;
}

export interface RespuestaHttp {
  estado: number;
  headers: Record<string, string>;
  cuerpo: unknown;
  /** JSON formateado, texto plano o descripción del binario recibido. */
  contenido: string;
  ms: number;
}

export interface PasoPlayground {
  id: string;
  grupo: string;
  titulo: string;
  servicio: Servicio;
  metodo: Metodo;
  /** Ruta con parámetros `{nombre}`; se anteponen el origen y el prefijo del servicio. */
  ruta: string;
  path?: Record<string, string>;
  headers: Record<string, string>;
  /** Plantilla JSON; con `archivos` representa los campos del formulario multipart. */
  body?: string;
  archivos?: ArchivoPlantilla[];
  binario?: boolean;
  nota?: string;
  /** Variables del contexto que se extraen de una respuesta 2xx. */
  capturar?: (cuerpo: Record<string, unknown>) => Record<string, string | undefined>;
  /** En la reproducción automática, indica si hay que volver a consultar el paso. */
  reintentar?: (respuesta: RespuestaHttp) => boolean;
}

export interface Peticion {
  metodo: Metodo;
  url: string;
  headers: Record<string, string>;
  json?: unknown;
  formulario?: {
    campos: Record<string, string>;
    archivos: { campo: string; nombre: string; tipo: string; contenido: Uint8Array<ArrayBuffer> }[];
  };
  binario: boolean;
}

export interface ResultadoPaso {
  estado: 'ejecutando' | 'ok' | 'error';
  intento?: number;
  http?: RespuestaHttp;
  mensaje?: string;
}

export interface EdicionPaso {
  headers?: string;
  body?: string;
  path?: Record<string, string>;
}
