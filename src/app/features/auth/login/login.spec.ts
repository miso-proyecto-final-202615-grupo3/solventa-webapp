import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Login } from './login';

describe('Login', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, router: TestBed.inject(Router) };
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
    const { fixture, el, router } = await setup();
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fill(el, 'camila.rojas@correo.com', 'secreto');
    submit(el);
    await fixture.whenStable();
    expect(nav).toHaveBeenCalledWith('/cliente/polizas');
  });
});
