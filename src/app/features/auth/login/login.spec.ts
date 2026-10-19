import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Login } from './login';

describe('Login', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      el,
      router: TestBed.inject(Router),
      http: TestBed.inject(HttpTestingController),
    };
  }

  function fill(el: HTMLElement, email: string, password: string) {
    const set = (id: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('email', email);
    set('password', password);
  }

  function submit(el: HTMLElement) {
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
  }

  it('shows validation errors and does not navigate when empty', async () => {
    const { fixture, el, router } = await setup();
    const nav = vi.spyOn(router, 'navigateByUrl');
    submit(el);
    fixture.detectChanges();
    expect(el.textContent).toContain('Escribe el correo de tu cuenta.');
    expect(el.textContent).toContain('Escribe tu contraseña.');
    expect(nav).not.toHaveBeenCalled();
  });

  it('rejects malformed email', async () => {
    const { fixture, el } = await setup();
    fill(el, 'no-es-correo', 'x');
    submit(el);
    fixture.detectChanges();
    expect(el.textContent).toContain('Revisa el formato del correo');
  });

  it('toggles password visibility', async () => {
    const { fixture, el } = await setup();
    const pwd = el.querySelector<HTMLInputElement>('#password')!;
    expect(pwd.type).toBe('password');
    el.querySelector<HTMLButtonElement>('button.link')!.click();
    fixture.detectChanges();
    expect(pwd.type).toBe('text');
  });

  it('navigates on valid submit', async () => {
    const { fixture, el, router, http } = await setup();
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fill(el, 'camila.rojas@correo.com', 'secreto');
    submit(el);
    http
      .expectOne('/api/v1/bff-web/clientes/autenticar')
      .flush({ access_token: 'tok', id_token: 'id', token_type: 'Bearer' });
    await fixture.whenStable();
    expect(nav).toHaveBeenCalledWith('/cliente/polizas');
  });

  it('shows an error and stays on the page when credentials are wrong', async () => {
    const { fixture, el, router, http } = await setup();
    const nav = vi.spyOn(router, 'navigateByUrl');
    fill(el, 'camila.rojas@correo.com', 'mala');
    submit(el);
    http
      .expectOne('/api/v1/bff-web/clientes/autenticar')
      .flush({ detail: 'Credenciales inválidas.' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('Correo o contraseña incorrectos.');
    expect(nav).not.toHaveBeenCalled();
  });
});
