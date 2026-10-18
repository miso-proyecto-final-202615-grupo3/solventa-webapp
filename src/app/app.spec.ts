import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'cliente', children: [] },
          { path: 'login', children: [] },
        ]),
      ],
    }).compileComponents();
  });

  it('debe crear la app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('debe mostrar la marca Solventa', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app__brand')?.textContent).toContain('Solventa');
  });

  it('en el portal del cliente oculta la cabecera pública y usa todo el ancho', async () => {
    const fixture = TestBed.createComponent(App);
    const el = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/cliente');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('.app__brand')).toBeNull();
    expect(el.querySelector('.app__main--libre')).not.toBeNull();

    await router.navigateByUrl('/login');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('.app__brand')).not.toBeNull();
  });
});
