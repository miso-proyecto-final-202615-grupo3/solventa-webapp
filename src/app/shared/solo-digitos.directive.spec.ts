import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SoloDigitosDirective } from './solo-digitos.directive';

@Component({
  imports: [ReactiveFormsModule, SoloDigitosDirective],
  template: '<input appSoloDigitos [formControl]="control" />',
})
class HostComponent {
  readonly control = new FormControl('', { nonNullable: true });
}

describe('SoloDigitosDirective', () => {
  function escribir(texto: string) {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = texto;
    input.dispatchEvent(new Event('input'));
    return { input, control: fixture.componentInstance.control };
  }

  it('descarta letras, espacios y símbolos al escribir o pegar', () => {
    const { input, control } = escribir('+57 300-abc123');
    expect(input.value).toBe('57300123');
    expect(control.value).toBe('57300123');
  });

  it('deja intactos los números', () => {
    const { input, control } = escribir('1020304050');
    expect(input.value).toBe('1020304050');
    expect(control.value).toBe('1020304050');
  });
});
