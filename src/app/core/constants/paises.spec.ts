import { PAISES } from './paises';

describe('PAISES', () => {
  it('pone a Colombia de primero', () => {
    expect(PAISES[0]).toBe('Colombia');
  });

  it('ordena alfabéticamente el resto', () => {
    const resto = PAISES.slice(1);
    expect(resto).toEqual([...resto].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('no repite países y trae nombres en español', () => {
    expect(new Set(PAISES).size).toBe(PAISES.length);
    expect(PAISES).toContain('Estados Unidos');
    expect(PAISES).toContain('España');
  });
});
