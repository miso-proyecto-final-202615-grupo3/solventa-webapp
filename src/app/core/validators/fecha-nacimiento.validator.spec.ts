import { FormControl } from '@angular/forms';
import { fechaNacimientoValida } from './fecha-nacimiento.validator';

describe('fechaNacimientoValida', () => {
  it('acepta una fecha en el pasado', () => {
    expect(fechaNacimientoValida(new FormControl('1990-05-15'))).toBeNull();
  });

  it('rechaza una fecha futura', () => {
    expect(fechaNacimientoValida(new FormControl('2999-01-01'))).toEqual({
      fechaFutura: true,
    });
  });

  it('rechaza un valor que no es fecha', () => {
    expect(fechaNacimientoValida(new FormControl('no-es-fecha'))).toEqual({
      fechaInvalida: true,
    });
  });

  it('ignora campo vacío', () => {
    expect(fechaNacimientoValida(new FormControl(''))).toBeNull();
  });
});
