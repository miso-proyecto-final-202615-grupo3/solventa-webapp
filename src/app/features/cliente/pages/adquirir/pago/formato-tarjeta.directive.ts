import { Directive, ElementRef, HostListener, forwardRef, inject, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type FormatoTarjeta = 'numero' | 'vencimiento' | 'cvv';

@Directive({
  selector: 'input[appFormatoTarjeta]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormatoTarjetaDirective),
      multi: true,
    },
  ],
})
export class FormatoTarjetaDirective implements ControlValueAccessor {
  readonly appFormatoTarjeta = input.required<FormatoTarjeta>();
  private readonly elemento = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private anterior = '';
  private onChange: (valor: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(valor: string | null): void {
    this.anterior = this.formatear(this.digitos(valor ?? ''));
    this.elemento.value = this.anterior;
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.elemento.disabled = deshabilitado;
  }

  @HostListener('input', ['$event'])
  actualizar(evento: InputEvent): void {
    let texto = this.elemento.value;
    let posicion = this.elemento.selectionStart ?? texto.length;
    if (
      (evento.inputType === 'deleteContentBackward' ||
        evento.inputType === 'deleteContentForward') &&
      /\D/.test(this.anterior[posicion] ?? '') &&
      this.anterior.slice(0, posicion) + this.anterior.slice(posicion + 1) === texto
    ) {
      const borrar = evento.inputType === 'deleteContentBackward' ? posicion - 1 : posicion;
      if (borrar >= 0 && borrar < texto.length && /\d/.test(texto[borrar])) {
        texto = texto.slice(0, borrar) + texto.slice(borrar + 1);
        if (borrar < posicion) posicion--;
      }
    }

    const cantidadAntes = texto.slice(0, posicion).replace(/\D/g, '').length;
    const valor = this.digitos(texto);
    const formateado = this.formatear(valor);
    this.elemento.value = formateado;
    let cursor = 0;
    let digitos = 0;
    while (cursor < formateado.length && digitos < cantidadAntes) {
      if (/\d/.test(formateado[cursor])) digitos++;
      cursor++;
    }
    this.elemento.setSelectionRange(cursor, cursor);
    this.anterior = formateado;
    this.onChange(valor);
  }

  @HostListener('blur')
  marcarTocado(): void {
    this.onTouched();
  }

  private digitos(valor: string): string {
    const maximo =
      this.appFormatoTarjeta() === 'numero'
        ? 19
        : this.appFormatoTarjeta() === 'vencimiento'
          ? 4
          : 3;
    return valor.replace(/\D/g, '').slice(0, maximo);
  }

  private formatear(valor: string): string {
    if (this.appFormatoTarjeta() === 'numero') return valor.replace(/(\d{4})(?=\d)/g, '$1 ');
    if (this.appFormatoTarjeta() === 'vencimiento' && valor.length > 2) {
      return `${valor.slice(0, 2)}/${valor.slice(2)}`;
    }
    return valor;
  }
}
