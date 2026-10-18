import { FormControl } from '@angular/forms';
import { fechaMaximaMayorDeEdad, fechaNacimientoValida } from './fecha-nacimiento.validator';

function hace(anios: number, dias = 0): string {
  const hoy = new Date();
  const fecha = new Date(hoy.getFullYear() - anios, hoy.getMonth(), hoy.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

describe('fechaNacimientoValida', () => {
  it('acepta una persona mayor de edad', () => {
    expect(fechaNacimientoValida(new FormControl('1990-05-15'))).toBeNull();
  });

  it('acepta a quien cumple 18 años hoy', () => {
    expect(fechaNacimientoValida(new FormControl(hace(18)))).toBeNull();
  });

  it('rechaza a quien cumple 18 años mañana', () => {
    expect(fechaNacimientoValida(new FormControl(hace(18, 1)))).toEqual({ menorDeEdad: true });
  });

  it('rechaza a un menor de edad', () => {
    expect(fechaNacimientoValida(new FormControl(hace(10)))).toEqual({ menorDeEdad: true });
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

  it('rechaza una fecha que no existe o es absurda', () => {
    expect(fechaNacimientoValida(new FormControl('1990-02-31'))).toEqual({ fechaInvalida: true });
    expect(fechaNacimientoValida(new FormControl('1850-01-01'))).toEqual({ fechaInvalida: true });
  });

  it('ignora campo vacío', () => {
    expect(fechaNacimientoValida(new FormControl(''))).toBeNull();
  });

  it('calcula la fecha máxima para el selector', () => {
    expect(fechaMaximaMayorDeEdad(new Date(2026, 9, 18))).toBe('2008-10-18');
  });
});
