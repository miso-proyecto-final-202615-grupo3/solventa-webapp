import { routes } from './app.routes';

describe('routes', () => {
  it('registro y terminos son alcanzables: van antes del comodín', () => {
    const paths = routes.map((route) => route.path);

    expect(paths.indexOf('registro')).toBeGreaterThan(-1);
    expect(paths.indexOf('terminos')).toBeGreaterThan(-1);
    expect(paths.indexOf('registro')).toBeLessThan(paths.indexOf('**'));
    expect(paths.indexOf('terminos')).toBeLessThan(paths.indexOf('**'));
  });

  it.each(['login', 'registro', 'terminos', 'operador/auditoria-consentimiento'])(
    'carga de forma diferida la ruta %s',
    async (path) => {
      const route = routes.find((r) => r.path === path);

      expect(route?.loadComponent).toBeDefined();
      expect(await (route?.loadComponent as () => Promise<unknown>)()).toBeTruthy();
    },
  );

  it('carga el cotizador dentro del portal del cliente', async () => {
    const cliente = routes.find((route) => route.path === 'cliente');
    const cotizar = cliente?.children?.find((route) => route.path === 'cotizar');

    expect(cotizar?.loadComponent).toBeDefined();
    expect(await (cotizar?.loadComponent as () => Promise<unknown>)()).toBeTruthy();
  });
});
