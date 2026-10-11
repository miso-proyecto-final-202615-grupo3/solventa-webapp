import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthError, AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected get emailError(): string | null {
    const c = this.form.controls.email;
    if (!c.touched || c.valid) return null;
    return c.hasError('required')
      ? 'Escribe el correo de tu cuenta.'
      : 'Revisa el formato del correo, por ejemplo nombre@correo.com.';
  }

  protected get passwordError(): string | null {
    const c = this.form.controls.password;
    return c.touched && c.hasError('required') ? 'Escribe tu contraseña.' : null;
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected async submit(): Promise<void> {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigateByUrl('/cliente/polizas');
    } catch (e) {
      this.formError.set(
        e instanceof AuthError
          ? e.message
          : 'No pudimos iniciar tu sesión. Intenta de nuevo en un momento.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
