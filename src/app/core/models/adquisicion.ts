export interface FirmaDigital {
  firma_id: string;
  cotizacion_id: string;
  cliente_id: string;
  producto_id: string;
  estado: 'CAPTURADA' | 'REEMPLAZADA' | 'VINCULADA';
}

export type MetodoPago = 'PAYPAL' | 'TARJETA_CREDITO';
export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'ERROR';

export interface ResumenPago {
  cotizacion_id: string;
  prima_total: string;
  moneda: string;
  expira_en: string;
  metodos_pago: { codigo: MetodoPago; por_defecto: boolean }[];
}

export interface SolicitudPago {
  cotizacion_id: string;
  cliente_id: string;
  metodo_pago: MetodoPago;
  paypal_email?: string;
  numero_tarjeta?: string;
  mes_expiracion?: number;
  anio_expiracion?: number;
  cvv?: string;
}

export interface Pago {
  pago_id: string;
  cotizacion_id: string;
  cliente_id: string;
  estado: EstadoPago;
  codigo_rechazo: string | null;
}

export interface ResumenPoliza {
  poliza_id: string;
  numero: string;
  estado: string;
  cotizacion_id: string;
  titular_nombre: string;
  vigencia_desde: string;
  vigencia_hasta: string;
  prima: string;
  moneda: string | null;
  estado_certificado: 'PENDIENTE' | 'GENERADO';
}

export interface EstadoCertificado {
  poliza_id: string;
  estado_certificado: 'PENDIENTE' | 'GENERADO';
  disponible: boolean;
  ultima_generacion: {
    estado: 'EN_PROCESO' | 'GENERADO' | 'FALLIDO';
    error_codigo: string | null;
  } | null;
}
