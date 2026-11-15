import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
} from '@angular/core';

@Component({
  selector: 'app-espera',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './espera.component.scss',
  template: `
    <div class="espera">
      <div
        class="espera__dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="espera-titulo"
        tabindex="-1"
      >
        <span class="espera__icono" aria-hidden="true"></span>
        <h2 id="espera-titulo">{{ titulo() }}</h2>
        <p role="status">{{ mensaje() }}</p>
      </div>
    </div>
  `,
})
export class EsperaComponent implements AfterViewInit {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly titulo = input.required<string>();
  readonly mensaje = input.required<string>();

  ngAfterViewInit(): void {
    this.elemento.nativeElement.querySelector<HTMLElement>('[role="dialog"]')?.focus();
  }
}
