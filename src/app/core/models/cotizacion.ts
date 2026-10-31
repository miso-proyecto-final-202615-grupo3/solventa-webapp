export interface Cobertura {
  cobertura_id: string;
  codigo: string;
  nombre: string;
  limite_asegurado: string;
  deducible: string;
}

export interface ParametroSeguro {
  nombre: string;
  etiqueta: string;
  descripcion?: string;
  tipo: string;
  requerido?: boolean;
  minimo?: string | null;
  maximo?: string | null;
  unidad?: string | null;
}

export interface Producto {
  producto_id: string;
  codigo: string;
  nombre: string;
  ramo: string;
  pais: string;
  estado: string;
  moneda: string;
  mensaje_legal: string;
  fuentes_datos: string[];
  parametros: ParametroSeguro[];
  coberturas: Cobertura[];
}

export interface SolicitudCotizacion {
  cliente_id: string;
  producto_codigo: string;
  parametros: Record<string, string | number | boolean | Ubicacion>;
  socio_id?: string | null;
}

export interface Ubicacion {
  municipio: string;
  zona: string;
  estrato: number;
}

export interface Ajuste {
  concepto: string;
  tipo: string;
  valor: string;
  motivo: string;
}

export interface Impuesto {
  concepto: string;
  tasa: string;
  valor: string;
}

export interface CoberturaCotizada extends Cobertura {
  prima: string;
}

export interface Cotizacion {
  cotizacion_id: string;
  cliente_id: string;
  producto_codigo: string;
  estado: string;
  moneda: string;
  prima_base: string;
  ajustes: Ajuste[];
  impuestos: Impuesto[];
  prima_total: string;
  degradada: boolean;
  motivos_degradacion: string[];
  coberturas: CoberturaCotizada[];
  expira_en: string;
  creada_en: string | null;
}
