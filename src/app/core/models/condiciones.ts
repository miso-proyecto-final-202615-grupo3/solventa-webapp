export type DecisionCondiciones = 'ACEPTADA' | 'RECHAZADA';

export interface DecisionResponse {
  decision_condiciones_id: string;
  condiciones_cotizacion_id: string;
  cliente_id: string;
  version_condiciones_generales: string;
  decision: DecisionCondiciones;
  decidida_en: string;
}

export interface Condiciones {
  condiciones_cotizacion_id: string;
  cotizacion_id: string;
  version_condiciones_generales: string;
  condiciones_generales: string;
  condiciones_particulares: Record<string, unknown>;
  creada_en: string;
  ultima_decision?: DecisionResponse | null;
}
