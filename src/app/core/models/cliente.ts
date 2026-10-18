export interface ClienteCreate {
  nombres: string;
  apellidos: string;
  tipo_documento: 'CC';
  numero_identificacion: string;
  correo: string;
  password: string;
  fecha_nacimiento: string;
  pais_residencia: string;
  telefono: string;
  /** El backend audita la aceptación en el mismo registro (HU1.1.2). */
  consentimiento_datos: boolean;
}

export interface ClienteResponse {
  id: string;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_identificacion: string;
  correo: string;
  fecha_nacimiento: string;
  pais_residencia: string;
  telefono: string;
  estado_kyc: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}
