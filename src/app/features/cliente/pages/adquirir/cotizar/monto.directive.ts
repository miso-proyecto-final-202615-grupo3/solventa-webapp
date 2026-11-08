import { Directive, ElementRef, forwardRef, HostListener, inject } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';

@Directive({
  selector: 'input[appMonto]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MontoDirective), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => MontoDirective), multi: true },
  ],
})
export class MontoDirective implements ControlValueAccessor, Validator {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private onChange: (value: number | string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private valorAnterior = '';
  private formatoInvalido = false;

  writeValue(value: number | string | null): void {
    if (value === null || value === '') {
      this.input.value = '';
      this.valorAnterior = '';
      this.formatoInvalido = false;
      return;
    }
    const texto = String(value).replace('.', ',');
    this.input.value = this.formatear(texto);
    this.valorAnterior = this.input.value;
    this.formatoInvalido = false;
  }

  registerOnChange(fn: (value: number | string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.input.disabled = disabled;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    return typeof control.value === 'string' && control.value !== '' ? { monto: true } : null;
  }

  @HostListener('input', ['$event'])
  actualizar(event: InputEvent): void {
    let texto = this.input.value;
    let posicion = this.input.selectionStart ?? texto.length;
    if (
      !this.formatoInvalido &&
      (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteContentForward') &&
      this.valorAnterior[posicion] === '.' &&
      this.valorAnterior.slice(0, posicion) + this.valorAnterior.slice(posicion + 1) === texto
    ) {
      const borrar = event.inputType === 'deleteContentBackward' ? posicion - 1 : posicion;
      if (borrar >= 0 && borrar < texto.length && /\d/.test(texto[borrar])) {
        texto = texto.slice(0, borrar) + texto.slice(borrar + 1);
        if (borrar < posicion) posicion--;
      }
    }

    if (texto === '') {
      this.input.value = '';
      this.valorAnterior = '';
      this.formatoInvalido = false;
      this.onChange(null);
      return;
    }
    if (event.inputType === 'insertFromPaste' || event.data === '.') {
      this.formatoInvalido = true;
    }
    if (this.formatoInvalido && /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d*)?$/.test(texto)) {
      this.formatoInvalido = false;
    }
    const sinSeparadores = texto.replace(/\./g, '');
    if (this.formatoInvalido || !/^-?\d+(?:,\d*)?$/.test(sinSeparadores)) {
      this.valorAnterior = texto;
      this.onChange(texto);
      return;
    }

    const valor = Number(sinSeparadores.replace(',', '.'));
    if (!Number.isFinite(valor)) {
      this.valorAnterior = texto;
      this.onChange(texto);
      return;
    }
    const antesDelCursor = texto.slice(0, posicion).replace(/\./g, '').length;
    const formateado = this.formatear(sinSeparadores);
    this.input.value = formateado;
    let cursor = 0;
    let caracteres = 0;
    while (cursor < formateado.length && caracteres < antesDelCursor) {
      if (formateado[cursor] !== '.') caracteres++;
      cursor++;
    }
    this.input.setSelectionRange(cursor, cursor);
    this.valorAnterior = formateado;
    this.onChange(valor);
  }

  @HostListener('blur')
  marcarTocado(): void {
    this.onTouched();
  }

  private formatear(texto: string): string {
    const [entero, decimal] = texto.split(',');
    const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decimal === undefined ? agrupado : `${agrupado},${decimal}`;
  }
}
