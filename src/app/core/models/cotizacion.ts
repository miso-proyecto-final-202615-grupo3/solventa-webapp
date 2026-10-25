export interface CotizarRequest {
  cliente_id: string;
  producto_codigo: 'VIDA_HIPOTECARIO';
  parametros: {
    saldo_credito: number;
    ubicacion: {
      municipio: string;
      zona: 'URBANA' | 'RURAL';
      estrato: number;
    };
  };
}

export interface ParametroProducto {
  nombre: string;
  etiqueta: string;
  descripcion: string;
  tipo: string;
  requerido: boolean;
  minimo: number | null;
  maximo: number | null;
  unidad: string | null;
}

export interface ProductoCotizacion {
  producto_id: string;
  codigo: string;
  nombre: string;
  ramo: string;
  pais: string;
  estado: string;
  moneda: string;
  mensaje_legal: string;
  fuentes_datos: string[];
  parametros: ParametroProducto[];
  coberturas: {
    cobertura_id: string;
    codigo: string;
    nombre: string;
    limite_asegurado: number;
    deducible: number;
  }[];
}

export interface AjusteCotizacion {
  concepto: string;
  tipo: 'DEDUCCION' | 'RECARGO';
  valor: number;
  motivo: string;
}

export interface CotizacionResponse {
  cotizacion_id: string;
  cliente_id: string;
  producto_codigo: 'VIDA_HIPOTECARIO';
  estado: string;
  moneda: 'COP';
  prima_base: number;
  prima_neta: number;
  ajustes: AjusteCotizacion[];
  impuestos: { concepto: string; tasa: number; valor: number }[];
  prima_total: number;
  degradada: boolean;
  motivos_degradacion: string[];
  coberturas: {
    cobertura_id: string;
    codigo: string;
    nombre: string;
    prima: number;
    limite_asegurado: number;
    deducible: number;
  }[];
  expira_en: string;
  creada_en: string | null;
}
