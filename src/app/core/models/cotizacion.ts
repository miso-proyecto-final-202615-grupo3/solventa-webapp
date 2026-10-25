export interface CotizarRequest {
  cliente_id: string;
  ramo: 'VIDA_HIPOTECARIO';
  consentimiento_version: string;
  parametros: {
    saldo_credito: number;
    ubicacion: {
      municipio: string;
      zona: 'URBANA' | 'RURAL';
      estrato: number;
    };
  };
}

export interface DesgloseCotizacion {
  prima_base: number;
  ajustes: number;
  prima_neta: number;
  impuestos: number;
}

export type FuentePerfil = 'PROVEEDORES' | 'CACHE' | 'FALLBACK' | 'PARCIAL';

export interface CotizacionResponse {
  cotizacion_id: string;
  estado: 'COTIZADA';
  ramo: 'VIDA_HIPOTECARIO';
  moneda: 'COP';
  prima_mensual: number;
  desglose: DesgloseCotizacion;
  explicacion_ajustes: string[];
  fuente_perfil: FuentePerfil;
  vigencia_hasta: string;
}
