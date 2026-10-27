export interface ParametroSeguro {
  nombre: string;
  etiqueta: string;
  descripcion: string;
  tipo: string;
  requerido: boolean;
  minimo: number | string | null;
  maximo: number | string | null;
  unidad: string | null;
}

export interface Cobertura {
  cobertura_id: string;
  codigo: string;
  nombre: string;
  limite_asegurado: number | string;
  deducible: number | string;
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
