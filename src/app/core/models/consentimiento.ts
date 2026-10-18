export type EstadoConsentimiento = 'ACEPTADO' | 'REVOCADO';

export interface ConsentimientoResponse {
  cliente_id: string;
  estado: EstadoConsentimiento;
  otorgado_en: string | null;
  revocado_en: string | null;
}
