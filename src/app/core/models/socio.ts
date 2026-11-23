export interface RegistrarSocioRequest {
  nombre: string;
  correo: string;
  tipo_socio: string;
  canal_integracion: string;
}

export interface SocioRegistrado extends RegistrarSocioRequest {
  id: string;
  estado: 'PENDIENTE' | 'ACTIVO' | 'RECHAZADO';
  creado_en: string;
}

export interface ApiKeyResumen {
  api_key_id: string;
  fecha_generacion: string;
}

export interface ApiKeyCreada extends ApiKeyResumen {
  api_key: string;
}
