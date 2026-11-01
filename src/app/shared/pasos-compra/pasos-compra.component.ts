import { ChangeDetectionStrategy, Component, input } from '@angular/core';

const PASOS = ['Datos', 'Prima', 'Pago', 'Emitida'] as const;

@Component({
  selector: 'app-pasos-compra',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './pasos-compra.component.scss',
  template: `
    <ol class="pasos" aria-label="Pasos de la compra">
      @for (paso of pasos; track paso; let i = $index) {
        <li
          class="pasos__item"
          [class.pasos__item--hecho]="i < actual()"
          [class.pasos__item--actual]="i === actual()"
          [attr.aria-current]="i === actual() ? 'step' : null"
        >
          <span class="pasos__num">{{ i + 1 }}</span> {{ paso }}
        </li>
      }
    </ol>
  `,
})
export class PasosCompraComponent {
  readonly actual = input.required<number>();
  protected readonly pasos = PASOS;
}
