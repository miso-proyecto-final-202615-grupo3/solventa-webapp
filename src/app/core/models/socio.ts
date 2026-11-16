export interface RegistrarSocioRequest {
  nombre: string;
  tipo_socio: string;
  canal_integracion: string;
}

export interface SocioRegistrado extends RegistrarSocioRequest {
  id: string;
  estado: 'PENDIENTE' | 'ACTIVO' | 'RECHAZADO';
  creado_en: string;
}
