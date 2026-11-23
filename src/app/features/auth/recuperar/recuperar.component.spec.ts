import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RecuperarClaveComponent } from './recuperar.component';

const SOLICITAR_URL = '/api/v1/bff-web/clientes/recuperar-clave';
const CONFIRMAR_URL = `${SOLICITAR_URL}/confirmar`;

describe('RecuperarClaveComponent', () => {
  let fixture: ComponentFixture<RecuperarClaveComponent>;
  let httpMock: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const button = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const setInput = (id: string, value: string) => {
    const input = el().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecuperarClaveComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(RecuperarClaveComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('solicita el código con el correo y presenta respuesta genérica', async () => {
    setInput('email', 'ja.tapia911@uniandes.edu.co');
    fixture.detectChanges();
    button().click();

    const request = httpMock.expectOne(SOLICITAR_URL);
    expect(request.request.body).toEqual({ correo: 'ja.tapia911@uniandes.edu.co' });
    request.flush({
      mensaje: 'Si existe una cuenta con ese correo verificado, enviaremos un código.',
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().textContent).toContain('Revisa tu correo');
    expect(el().querySelector('#codigo')).not.toBeNull();
  });

  it('confirma el código, valida ambas claves y confirma el cambio', async () => {
    setInput('email', 'ja.tapia911@uniandes.edu.co');
    fixture.detectChanges();
    button().click();
    httpMock
      .expectOne(SOLICITAR_URL)
      .flush({ mensaje: 'Si existe una cuenta, enviaremos un código.' });
    await fixture.whenStable();
    fixture.detectChanges();

    setInput('codigo', '123456');
    setInput('nueva-clave', 'NuevaClave123');
    setInput('confirmar-clave', 'NuevaClave123');
    fixture.detectChanges();
    button().click();

    const request = httpMock.expectOne(CONFIRMAR_URL);
    expect(request.request.body).toEqual({
      correo: 'ja.tapia911@uniandes.edu.co',
      codigo: '123456',
      nueva_clave: 'NuevaClave123',
    });
    request.flush({ mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().textContent).toContain('Contraseña actualizada');
    expect(el().querySelector('a[routerLink="/login"]')).not.toBeNull();
  });

  it('no envía la confirmación si las contraseñas no coinciden', async () => {
    setInput('email', 'ja.tapia911@uniandes.edu.co');
    fixture.detectChanges();
    button().click();
    httpMock
      .expectOne(SOLICITAR_URL)
      .flush({ mensaje: 'Si existe una cuenta, enviaremos un código.' });
    await fixture.whenStable();
    fixture.detectChanges();

    setInput('codigo', '123456');
    setInput('nueva-clave', 'NuevaClave123');
    setInput('confirmar-clave', 'OtraClave123');
    fixture.detectChanges();
    button().click();
    fixture.detectChanges();

    expect(el().textContent).toContain('Las contraseñas no coinciden');
    httpMock.expectNone(CONFIRMAR_URL);
  });
});
