import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { PAISES } from '../constants/paises';

/** Estructura de correo: usuario@dominio.tld, sin espacios y con TLD de 2+ letras. */
const CORREO_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

export function correoValido(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) {
    return null;
  }
  return CORREO_PATTERN.test(value) ? null : { correoInvalido: true };
}

export function paisEnLista(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) {
    return null;
  }
  return PAISES.includes(value) ? null : { paisNoListado: true };
}

/** Valida que el valor sea solo dígitos con la longitud indicada. */
export function soloDigitos(min: number, max: number): ValidatorFn {
  const patron = new RegExp(`^\\d{${min},${max}}$`);
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (!value) {
      return null;
    }
    return patron.test(value) ? null : { digitosInvalidos: { min, max } };
  };
}
