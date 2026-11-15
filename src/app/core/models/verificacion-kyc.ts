import { ClienteResponse } from './cliente';

export type ResultadoVerificacion = 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';

/** Estado KYC del perfil del cliente en identity-service. */
export const KYC_VALIDADO = 'VALIDADO';

export type PerfilCliente = ClienteResponse;

export interface IniciarVerificacionResponse {
  verificacion_id: string;
  estado: string;
  fecha: string;
}

export interface VerificacionKycAml {
  verificacion_id: string;
  cliente_id: string;
  resultado_kyc: ResultadoVerificacion;
  resultado_aml: ResultadoVerificacion;
  estado: ResultadoVerificacion;
  fecha_resultado?: string | null;
}
