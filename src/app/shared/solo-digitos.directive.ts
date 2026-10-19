import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/** Descarta cualquier carácter que no sea un dígito mientras el usuario escribe o pega. */
@Directive({
  selector: 'input[appSoloDigitos]',
  host: { inputmode: 'numeric', autocomplete: 'off' },
})
export class SoloDigitosDirective {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  @HostListener('input')
  limpiar(): void {
    const limpio = this.input.value.replace(/\D/g, '');
    if (limpio !== this.input.value) {
      this.input.value = limpio;
      this.input.dispatchEvent(new Event('input'));
    }
  }
}
