import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ClienteShellComponent } from './cliente-shell.component';

describe('ClienteShellComponent', () => {
  async function setup() {
    sessionStorage.clear();
    sessionStorage.setItem(
      'solventa.auth',
      JSON.stringify({ token: 't', email: 'ana@correo.com' }),
    );
    await TestBed.configureTestingModule({
      imports: [ClienteShellComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ClienteShellComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('muestra el menú con Perfil como enlace y las secciones futuras deshabilitadas', async () => {
    const { el } = await setup();

    const perfil = el.querySelector<HTMLAnchorElement>('a[href="/cliente/perfil"]');
    expect(perfil?.textContent).toContain('Perfil');
    expect(el.querySelector('a[href="/cliente/polizas"]')?.textContent).toContain('Mis pólizas');
    const pronto = Array.from(el.querySelectorAll('[aria-disabled="true"]')).map((n) =>
      n.textContent?.trim(),
    );
    expect(pronto).toEqual(['Siniestros Pronto', 'Adquirir Pronto']);
  });

  it('muestra el correo de la sesión', async () => {
    const { el } = await setup();
    expect(el.querySelector('.shell__pie')?.textContent).toContain('ana@correo.com');
  });

  it('Cerrar sesión limpia la sesión y vuelve a /login', async () => {
    const { fixture, el } = await setup();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const auth = TestBed.inject(AuthService);

    el.querySelector<HTMLButtonElement>('.shell__salir')!.click();
    await fixture.whenStable();

    expect(auth.authenticated()).toBe(false);
    expect(nav).toHaveBeenCalledWith('/login');
  });
});
