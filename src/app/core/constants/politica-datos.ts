export interface FinalidadDatos {
  titulo: string;
  detalle: string;
  obligatoria: boolean;
}

/** Texto de la política de tratamiento de datos, tomado del prototipo del portal cliente. */
export const FINALIDADES_DATOS: readonly FinalidadDatos[] = [
  {
    titulo: 'Emitir y administrar tus pólizas',
    detalle: 'Datos de identificación y contacto. Sin esto no podemos emitir.',
    obligatoria: true,
  },
  {
    titulo: 'Evaluar y pagar siniestros',
    detalle: 'Evidencia, ubicación del evento y datos bancarios.',
    obligatoria: true,
  },
  {
    titulo: 'Calcular tu prima',
    detalle: 'Datos del riesgo que declaras al cotizar.',
    obligatoria: true,
  },
  {
    titulo: 'Ofertas y comunicaciones comerciales',
    detalle: 'Puedes revocarla cuando quieras sin afectar tus pólizas.',
    obligatoria: false,
  },
];

export const RETENCION_DATOS =
  'Conservamos tus datos 5 años después de terminar la relación comercial. Después los eliminamos o los anonimizamos.';
