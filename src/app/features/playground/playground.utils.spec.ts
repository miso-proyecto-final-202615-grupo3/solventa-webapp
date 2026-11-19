import { PASOS_PLAYGROUND } from './playground.catalog';
import { preparar, resolver, semillas, vista } from './playground.utils';

const paso = (id: string) => PASOS_PLAYGROUND.find((p) => p.id === id)!;

describe('playground utils', () => {
  it('resuelve variables del contexto y deja visibles las que faltan', () => {
    expect(resolver('{{a}}-{{b}}', { a: '1' })).toBe('1-{{b}}');
  });

  it('usa el origen actual para las URLs de ambos servicios', () => {
    const v = vista(paso('consultar-perfil'), { cliente_id: 'abc' }, undefined);
    expect(v.url).toBe(`${location.origin}/api/v1/bff-socios/clientes/abc/perfil`);
    expect(v.path).toEqual({ cliente_id: 'abc' });
    expect(JSON.parse(v.headers)['X-Client-Id']).toBe('abc');
    expect(vista(paso('autenticar-admin'), {}, undefined).url).toBe(
      `${location.origin}/api/v1/bff-web/clientes/autenticar`,
    );
    const ctx = { ...semillas(), cliente_id: 'abc', api_key: 'k' };
    expect(preparar(paso('consultar-perfil'), ctx, undefined).peticion?.url).toBe(v.url);
  });

  it('no arma la petición si falta una variable de pasos previos', () => {
    const { peticion, errores } = preparar(paso('consultar-perfil'), semillas(), undefined);
    expect(peticion).toBeUndefined();
    expect(errores.join(' ')).toContain('cliente_id');
  });

  it('rechaza un payload editado que no es JSON válido', () => {
    const ctx = { ...semillas(), cliente_id: 'c', api_key: 'k' };
    const { peticion, errores } = preparar(paso('actualizar-consentimiento'), ctx, {
      body: '{ roto',
    });
    expect(peticion).toBeUndefined();
    expect(errores).toContain('Payload: el JSON no es válido.');
  });

  it('prepara multipart con los campos del payload y los archivos de ejemplo', () => {
    const ctx = { ...semillas(), cliente_id: 'c', cotizacion_id: 'q', api_key: 'k' };
    const { peticion } = preparar(paso('iniciar-kyc'), ctx, undefined);
    expect(peticion?.formulario?.campos).toEqual({ cotizacion_id: 'q' });
    expect(peticion?.formulario?.archivos.map((a) => a.campo)).toEqual([
      'documento_frontal',
      'documento_reverso',
    ]);
    expect(peticion?.headers['Idempotency-Key']).toMatch(/^kyc-/);
  });
});
