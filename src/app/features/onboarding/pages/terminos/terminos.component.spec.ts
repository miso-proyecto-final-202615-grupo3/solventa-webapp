import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TERMINOS_VERSION } from '../../../../core/constants/terminos';
import { routes } from '../../../../app.routes';
import { TerminosComponent } from './terminos.component';

describe('TerminosComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerminosComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('muestra el texto legal completo con la versión vigente', () => {
    const fixture = TestBed.createComponent(TerminosComponent);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Consentimiento de uso de datos');
    expect(texto).toContain('Open Finance');
    expect(texto).toContain(`Versión ${TERMINOS_VERSION}`);
  });
});
