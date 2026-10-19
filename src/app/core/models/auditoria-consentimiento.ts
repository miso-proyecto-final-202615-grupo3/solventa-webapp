export type CriterioBusqueda = 'identificacion' | 'correo';

export type TipoAccionConsentimiento = 'ACEPTACION' | 'DENEGACION' | 'REVOCACION';

export interface ClienteAuditoria {
  id: string;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_identificacion: string;
  correo: string;
  /** Estado vigente; `null` si el cliente nunca registró consentimiento. */
  estado_consentimiento: 'ACEPTADO' | 'REVOCADO' | null;
}

export interface EventoAuditoriaConsentimiento {
  id: string;
  tipo_accion: TipoAccionConsentimiento;
  /** Fecha y hora exactas del evento, con zona horaria. */
  fecha: string;
  version_terminos: string;
  canal: string;
}

/** Log de consentimientos de un cliente, ordenado por fecha descendente. */
export interface AuditoriaConsentimientoResponse {
  cliente: ClienteAuditoria;
  eventos: EventoAuditoriaConsentimiento[];
}
