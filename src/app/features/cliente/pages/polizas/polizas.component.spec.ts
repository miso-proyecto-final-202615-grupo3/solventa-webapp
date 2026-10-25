import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PolizasComponent } from './polizas.component';

describe('PolizasComponent', () => {
  it('muestra el estado vacío y no ofrece registrarse a un cliente autenticado', async () => {
    await TestBed.configureTestingModule({
      imports: [PolizasComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(PolizasComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('Aún no tienes pólizas activas');
    expect(el.querySelector('a[href="/registro"]')).toBeNull();
    expect(el.querySelector('a[href="/cliente/cotizar"]')?.textContent).toContain(
      'Cotizar vida hipotecaria',
    );
  });
});
