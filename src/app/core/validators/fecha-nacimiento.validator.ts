import { AbstractControl, ValidationErrors } from '@angular/forms';

export function fechaNacimientoValida(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) {
    return null;
  }

  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) {
    return { fechaInvalida: true };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fecha >= hoy ? { fechaFutura: true } : null;
}
