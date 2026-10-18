import { AbstractControl, ValidationErrors } from '@angular/forms';

export const EDAD_MINIMA = 18;
const ANIO_MINIMO = 1900;

function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Fecha más reciente (ISO, zona local) en que alguien ya cumple la edad mínima hoy. */
export function fechaMaximaMayorDeEdad(hoy = new Date()): string {
  return aIso(new Date(hoy.getFullYear() - EDAD_MINIMA, hoy.getMonth(), hoy.getDate()));
}

export function fechaNacimientoValida(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) {
    return null;
  }

  const [anio, mes, dia] = value.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const existe =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  if (!existe || anio < ANIO_MINIMO) {
    return { fechaInvalida: true };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fecha >= hoy) {
    return { fechaFutura: true };
  }

  return value > fechaMaximaMayorDeEdad(hoy) ? { menorDeEdad: true } : null;
}
