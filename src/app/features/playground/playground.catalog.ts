import { ArchivoPlantilla, PasoPlayground, RespuestaHttp } from './playground.models';

export const PREFIJO_SOCIOS = '/api/v1/bff-socios';
export const PREFIJO_WEB = '/api/v1/bff-web';
export const CODIGO_PRODUCTO = 'VIDA_HIPOTECARIO';
export const ESPERA_ENTRE_LLAMADOS_SEGUNDOS = 5;
export const MAX_INTENTOS = 3;

const FIRMA_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAQCAIAAAD4YuoOAAAAW0lEQVR4nLXUMQ4AIAgD' +
  'QP7/aY1GHQgBhJbJhV6MiMiuQasVLbdYwDlxGB0HZ+wgIONFQJi4uclk28rMX0OBqVz8' +
  'i6k/YJLpDmLIYD6UwyAXg8ngF5xiWIv6MRNLiG3ZsdldgQAAAABJRU5ErkJggg==';

function conPrefijo(prefijo: number[], bytes: number): Uint8Array<ArrayBuffer> {
  const contenido = new Uint8Array(prefijo.length + bytes);
  contenido.set(prefijo);
  contenido.set(crypto.getRandomValues(new Uint8Array(bytes)), prefijo.length);
  return contenido;
}

const json = (valor: unknown) => JSON.stringify(valor, null, 2);

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : undefined);

const capturaId = (campo: string, variable: string) => (cuerpo: Record<string, unknown>) => ({
  [variable]: texto(cuerpo[campo]),
});

const headersWeb = (autenticado: boolean) => ({
  'X-Correlation-Id': '{{correlation_id}}',
  ...(autenticado ? { Authorization: 'Bearer {{access_token}}' } : {}),
});

const headersSocios = (opciones: { cliente?: boolean; idempotencia?: string } = {}) => ({
  'X-API-Key': '{{api_key}}',
  'X-Correlation-Id': '{{correlation_id}}',
  ...(opciones.cliente === false ? {} : { 'X-Client-Id': '{{cliente_id}}' }),
  ...(opciones.idempotencia ? { 'Idempotency-Key': `${opciones.idempotencia}-{{run_id}}` } : {}),
});

const archivosKyc: ArchivoPlantilla[] = [
  {
    campo: 'documento_frontal',
    nombre: 'documento-frontal.jpg',
    tipo: 'image/jpeg',
    generar: () => conPrefijo([0xff, 0xd8, 0xff], 1024),
  },
  {
    campo: 'documento_reverso',
    nombre: 'documento-reverso.png',
    tipo: 'image/png',
    generar: () => conPrefijo([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 1024),
  },
];

const archivosFirma: ArchivoPlantilla[] = [
  {
    campo: 'firma',
    nombre: 'firma.png',
    tipo: 'image/png',
    generar: () => Uint8Array.from(atob(FIRMA_PNG_BASE64), (c) => c.charCodeAt(0)),
  },
];

const certificadoPendiente = (r: RespuestaHttp) =>
  r.estado === 200 &&
  (r.cuerpo as { estado_certificado?: unknown } | null)?.estado_certificado === 'PENDIENTE';

/** Orden y datos de ejemplo tomados de temp/scripts/test_partners_embedded_insurance_process.py. */
export const PASOS_PLAYGROUND: readonly PasoPlayground[] = [
  {
    id: 'autenticar-admin',
    grupo: 'Fase 1 - Socio',
    titulo: 'Autenticar administrador',
    servicio: 'web',
    metodo: 'POST',
    ruta: '/clientes/autenticar',
    headers: headersWeb(false),
    body: json({ correo: 'admin@example.com', password: '<password-del-administrador>' }),
    nota: 'BFF Web (Identity Service). Escribe las credenciales reales del administrador de socios.',
    capturar: capturaId('access_token', 'access_token'),
  },
  {
    id: 'registrar-socio',
    grupo: 'Fase 1 - Socio',
    titulo: 'Registrar socio',
    servicio: 'web',
    metodo: 'POST',
    ruta: '/socios',
    headers: headersWeb(true),
    body: json({
      nombre: 'Socio prueba {{run_id}}',
      correo: 'socio-prueba-{{run_id}}@example.com',
      tipo_socio: 'BANCO',
      canal_integracion: 'API',
    }),
    nota: 'BFF Web. Requiere el token del administrador.',
    capturar: capturaId('id', 'socio_id'),
  },
  {
    id: 'generar-api-key',
    grupo: 'Fase 1 - Socio',
    titulo: 'Generar API key',
    servicio: 'web',
    metodo: 'POST',
    ruta: '/socios/{socio_id}/api-keys',
    path: { socio_id: '{{socio_id}}' },
    headers: headersWeb(true),
    nota: 'BFF Web. La API key obtenida se usa en las demás peticiones.',
    capturar: capturaId('api_key', 'api_key'),
  },
  {
    id: 'registrar-prospecto',
    grupo: 'Fase 2 - Prospecto',
    titulo: 'Registrar prospecto',
    servicio: 'socios',
    metodo: 'POST',
    ruta: '/clientes/prospectos',
    headers: headersSocios({ cliente: false }),
    body: json({
      nombres: 'Cliente',
      apellidos: 'Prueba Sistema',
      tipo_documento: 'CC',
      numero_identificacion: '{{numero_identificacion}}',
      correo: 'cliente-prueba-{{run_id}}@example.com',
      consentimiento_datos: true,
      fecha_nacimiento: '1990-05-15',
      pais_residencia: 'Colombia',
      telefono: '+573001234567',
    }),
    capturar: capturaId('id', 'cliente_id'),
  },
  {
    id: 'consultar-perfil',
    grupo: 'Fase 2 - Prospecto',
    titulo: 'Consultar perfil',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/clientes/{cliente_id}/perfil',
    path: { cliente_id: '{{cliente_id}}' },
    headers: headersSocios(),
  },
  {
    id: 'actualizar-consentimiento',
    grupo: 'Fase 2 - Prospecto',
    titulo: 'Actualizar consentimiento',
    servicio: 'socios',
    metodo: 'PUT',
    ruta: '/clientes/{cliente_id}/consentimiento',
    path: { cliente_id: '{{cliente_id}}' },
    headers: headersSocios(),
    body: json({ estado: 'ACEPTADO' }),
  },
  {
    id: 'listar-productos',
    grupo: 'Fase 3 - Catálogo',
    titulo: 'Listar productos',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/productos',
    headers: headersSocios({ cliente: false }),
  },
  {
    id: 'consultar-producto',
    grupo: 'Fase 3 - Catálogo',
    titulo: 'Consultar producto',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/productos/{codigo}',
    path: { codigo: CODIGO_PRODUCTO },
    headers: headersSocios({ cliente: false }),
    capturar: capturaId('producto_id', 'producto_id'),
  },
  {
    id: 'crear-cotizacion',
    grupo: 'Fase 4 - Cotización',
    titulo: 'Crear cotización',
    servicio: 'socios',
    metodo: 'POST',
    ruta: '/cotizaciones',
    headers: headersSocios(),
    body: json({
      cliente_id: '{{cliente_id}}',
      producto_codigo: CODIGO_PRODUCTO,
      parametros: {
        saldo_credito: 200000000,
        ubicacion: { municipio: 'Bogotá D.C.', zona: 'URBANA', estrato: 4 },
      },
    }),
    capturar: capturaId('cotizacion_id', 'cotizacion_id'),
  },
  {
    id: 'consultar-cotizacion',
    grupo: 'Fase 4 - Cotización',
    titulo: 'Consultar cotización',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/cotizaciones/{cotizacion_id}',
    path: { cotizacion_id: '{{cotizacion_id}}' },
    headers: headersSocios(),
  },
  {
    id: 'consultar-condiciones',
    grupo: 'Fase 5 - Condiciones',
    titulo: 'Consultar condiciones',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/cotizaciones/{cotizacion_id}/condiciones',
    path: { cotizacion_id: '{{cotizacion_id}}' },
    headers: headersSocios(),
    capturar: capturaId('condiciones_cotizacion_id', 'condiciones_id'),
  },
  {
    id: 'aceptar-condiciones',
    grupo: 'Fase 5 - Condiciones',
    titulo: 'Aceptar condiciones',
    servicio: 'socios',
    metodo: 'POST',
    ruta: '/cotizaciones/{cotizacion_id}/condiciones/decisiones',
    path: { cotizacion_id: '{{cotizacion_id}}' },
    headers: headersSocios(),
    body: json({ condiciones_cotizacion_id: '{{condiciones_id}}', decision: 'ACEPTADA' }),
  },
  {
    id: 'iniciar-kyc',
    grupo: 'Fase 6 - Identidad KYC/AML',
    titulo: 'Iniciar verificación',
    servicio: 'socios',
    metodo: 'POST',
    ruta: '/clientes/{cliente_id}/verificaciones-kyc-aml',
    path: { cliente_id: '{{cliente_id}}' },
    headers: headersSocios({ idempotencia: 'kyc' }),
    body: json({ cotizacion_id: '{{cotizacion_id}}' }),
    archivos: archivosKyc,
    capturar: capturaId('verificacion_id', 'verificacion_id'),
  },
  {
    id: 'consultar-kyc',
    grupo: 'Fase 6 - Identidad KYC/AML',
    titulo: 'Consultar verificación',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/clientes/{cliente_id}/verificaciones-kyc-aml/{verificacion_id}',
    path: { cliente_id: '{{cliente_id}}', verificacion_id: '{{verificacion_id}}' },
    headers: headersSocios(),
  },
  {
    id: 'capturar-firma',
    grupo: 'Fase 7 - Firma digital',
    titulo: 'Capturar firma',
    servicio: 'socios',
    metodo: 'POST',
    ruta: '/cotizaciones/{cotizacion_id}/firma-digital',
    path: { cotizacion_id: '{{cotizacion_id}}' },
    headers: headersSocios({ idempotencia: 'firma' }),
    body: json({ cliente_id: '{{cliente_id}}', producto_id: '{{producto_id}}' }),
    archivos: archivosFirma,
    capturar: capturaId('firma_id', 'firma_id'),
  },
  {
    id: 'consultar-firma',
    grupo: 'Fase 7 - Firma digital',
    titulo: 'Consultar firma',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/cotizaciones/{cotizacion_id}/firma-digital',
    path: { cotizacion_id: '{{cotizacion_id}}' },
    headers: headersSocios(),
  },
  {
    id: 'resumen-pago',
    grupo: 'Fase 8 - Pago',
    titulo: 'Consultar resumen de pago',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/cotizaciones/{cotizacion_id}/resumen-pago',
    path: { cotizacion_id: '{{cotizacion_id}}' },
    headers: headersSocios(),
  },
  {
    id: 'pagar-prima',
    grupo: 'Fase 8 - Pago',
    titulo: 'Pagar prima',
    servicio: 'socios',
    metodo: 'POST',
    ruta: '/pagos',
    headers: headersSocios({ idempotencia: 'pago' }),
    body: json({
      cotizacion_id: '{{cotizacion_id}}',
      cliente_id: '{{cliente_id}}',
      metodo_pago: 'TARJETA_CREDITO',
      numero_tarjeta: '4242424242424242',
      mes_expiracion: 12,
      anio_expiracion: 2099,
      cvv: '123',
    }),
    capturar: capturaId('pago_id', 'pago_id'),
  },
  {
    id: 'consultar-pago',
    grupo: 'Fase 8 - Pago',
    titulo: 'Consultar pago',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/pagos/{pago_id}',
    path: { pago_id: '{{pago_id}}' },
    headers: headersSocios(),
  },
  {
    id: 'poliza-por-cotizacion',
    grupo: 'Fase 9 - Póliza',
    titulo: 'Consultar póliza por cotización',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/cotizaciones/{cotizacion_id}/poliza',
    path: { cotizacion_id: '{{cotizacion_id}}' },
    headers: headersSocios(),
    nota: 'La emisión es asíncrona: el Play reintenta mientras responda 404.',
    capturar: capturaId('poliza_id', 'poliza_id'),
    reintentar: (r) => r.estado === 404,
  },
  {
    id: 'poliza-por-id',
    grupo: 'Fase 9 - Póliza',
    titulo: 'Consultar póliza por ID',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/polizas/{poliza_id}',
    path: { poliza_id: '{{poliza_id}}' },
    headers: headersSocios(),
  },
  {
    id: 'mis-polizas',
    grupo: 'Fase 9 - Póliza',
    titulo: 'Listar pólizas del cliente',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/polizas/mis-polizas',
    headers: headersSocios(),
  },
  {
    id: 'consultar-certificado',
    grupo: 'Fase 10 - Certificado',
    titulo: 'Consultar certificado',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/polizas/{poliza_id}/certificado',
    path: { poliza_id: '{{poliza_id}}' },
    headers: headersSocios(),
    nota: 'El Play reintenta mientras el certificado esté PENDIENTE.',
    reintentar: certificadoPendiente,
  },
  {
    id: 'descargar-certificado',
    grupo: 'Fase 10 - Certificado',
    titulo: 'Descargar certificado',
    servicio: 'socios',
    metodo: 'GET',
    ruta: '/polizas/{poliza_id}/certificado/descarga',
    path: { poliza_id: '{{poliza_id}}' },
    headers: headersSocios(),
    binario: true,
  },
];
