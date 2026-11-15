export interface EventoTrazabilidadEmision {
  evento_id: string;
  cotizacion_id: string;
  cliente_id: string;
  tipo: string;
  ocurrido_en: string;
  origen: string;
  actor_id: string | null;
  resultado: string;
  referencia_id: string;
  correlation_id: string | null;
  detalles: Record<string, unknown>;
}

export interface TrazabilidadEmision {
  poliza_id: string;
  numero: string;
  cotizacion_id: string;
  cliente_id: string;
  eventos: EventoTrazabilidadEmision[];
}
