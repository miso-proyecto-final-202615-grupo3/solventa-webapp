import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  ParametroSeguro,
  Producto,
  SolicitudCotizacion,
} from '../../../../../core/models/cotizacion';
import { CotizacionService, SesionError } from '../../../../../core/services/cotizacion.service';
import { TipoControl, tipoControl, valorParametro } from '../../../../../core/utils/parametros';
import { PasosCompraComponent } from '../../../../../shared/pasos-compra/pasos-compra.component';
import { MontoDirective } from './monto.directive';

/** Compara fechas ISO (yyyy-MM-dd) como texto, que conserva el orden cronológico. */
function limiteFecha(minimo: string | null, maximo: string | null): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const v = c.value as string | null;
    if (!v) return null;
    if (minimo && v < minimo) return { min: { min: minimo } };
    if (maximo && v > maximo) return { max: { max: maximo } };
    return null;
  };
}

const MUNICIPIOS = [
  'Arauca',
  'Armenia',
  'Barranquilla',
  'Bogotá',
  'Bucaramanga',
  'Cali',
  'Cartagena',
  'Cúcuta',
  'Florencia',
  'Ibagué',
  'Inírida',
  'Leticia',
  'Manizales',
  'Medellín',
  'Mitú',
  'Mocoa',
  'Montería',
  'Neiva',
  'Pasto',
  'Pereira',
  'Popayán',
  'Puerto Carreño',
  'Quibdó',
  'Riohacha',
  'San Andrés',
  'San José del Guaviare',
  'Santa Marta',
  'Sincelejo',
  'Tunja',
  'Valledupar',
  'Villavicencio',
  'Yopal',
];
const ESTRATOS = ['1', '2', '3', '4', '5', '6'];
const ZONAS = [
  { valor: 'URBANA', etiqueta: 'Urbana' },
  { valor: 'RURAL', etiqueta: 'Rural' },
];

type UbicacionForm = FormGroup<{
  municipio: FormControl<string>;
  zona: FormControl<string>;
  estrato: FormControl<string>;
}>;

function ubicacionValida(requerido: boolean): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const municipio = control.get('municipio')?.value;
    const zona = control.get('zona')?.value;
    const estrato = control.get('estrato')?.value;
    if (!requerido && !municipio && !zona && !estrato) return null;
    return MUNICIPIOS.includes(municipio) &&
      ZONAS.some((opcion) => opcion.valor === zona) &&
      ESTRATOS.includes(estrato)
      ? null
      : { ubicacion: true };
  };
}

@Component({
  imports: [ReactiveFormsModule, RouterLink, PasosCompraComponent, MontoDirective],
  selector: 'app-cotizar',
  styleUrl: '../adquirir.scss',
  templateUrl: './cotizar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CotizarComponent implements OnInit {
  private readonly cotizaciones = inject(CotizacionService);
  private readonly router = inject(Router);

  /** Código del producto, tomado del segmento `:codigo` de la ruta. */
  private readonly codigo = inject(ActivatedRoute).snapshot.paramMap.get('codigo');

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly producto = signal<Producto | null>(null);
  protected readonly form = signal(new FormGroup<Record<string, FormControl | UbicacionForm>>({}));
  protected readonly parametros = computed(() => this.producto()?.parametros ?? []);
  protected readonly municipios = MUNICIPIOS;
  protected readonly estratos = ESTRATOS;
  protected readonly zonas = ZONAS;

  async ngOnInit(): Promise<void> {
    try {
      const productos = await firstValueFrom(this.cotizaciones.listarProductos());
      const producto = productos.find((p) => p.codigo === this.codigo) ?? null;
      if (!producto) {
        this.error.set('No encontramos ese producto en el catálogo.');
      } else {
        this.form.set(this.construirForm(producto));
        this.producto.set(producto);
      }
    } catch {
      this.error.set('No pudimos cargar el producto. Intenta de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected control(p: ParametroSeguro): TipoControl {
    return tipoControl(p.tipo);
  }

  protected esMonto(p: ParametroSeguro): boolean {
    return (
      this.control(p) === 'numero' &&
      (/monto|money/i.test(p.tipo) ||
        p.nombre.toLowerCase() === 'monto' ||
        (!!p.unidad && p.unidad.toUpperCase() === this.producto()?.moneda.toUpperCase()))
    );
  }

  protected esUbicacion(p: ParametroSeguro, codigo = this.producto()?.codigo): boolean {
    return (
      codigo === 'VIDA_HIPOTECARIO' && p.nombre === 'ubicacion' && p.tipo.toLowerCase() === 'object'
    );
  }

  protected ubicacionInvalida(p: ParametroSeguro): boolean {
    const control = this.form().controls[p.nombre];
    return !!control && control.touched && control.invalid;
  }

  protected mensaje(p: ParametroSeguro): string | null {
    const c = this.form().controls[p.nombre];
    if (!c || !c.touched || !c.errors) return null;
    if (c.errors['required']) return 'Este dato es obligatorio.';
    if (c.errors['monto']) return 'Ingresa un monto válido usando coma para los decimales.';
    if (c.errors['min']) return `El valor mínimo es ${p.minimo}${this.unidad(p)}.`;
    if (c.errors['max']) return `El valor máximo es ${p.maximo}${this.unidad(p)}.`;
    return 'Revisa este dato.';
  }

  protected rango(p: ParametroSeguro): string | null {
    const unidad = this.unidad(p);
    if (p.minimo && p.maximo) return `Entre ${p.minimo} y ${p.maximo}${unidad}.`;
    if (p.minimo) return `Mínimo ${p.minimo}${unidad}.`;
    if (p.maximo) return `Máximo ${p.maximo}${unidad}.`;
    return null;
  }

  protected async cotizar(): Promise<void> {
    const producto = this.producto();
    const form = this.form();
    if (!producto || this.enviando()) return;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const parametros: SolicitudCotizacion['parametros'] = {};
    for (const p of producto.parametros) {
      const control = form.controls[p.nombre];
      if (this.esUbicacion(p) && control instanceof FormGroup) {
        const { municipio, zona, estrato } = control.getRawValue();
        if (municipio || zona || estrato) {
          parametros[p.nombre] = { municipio, zona, estrato: Number(estrato) };
        }
      } else {
        const valor = valorParametro(p, control.value);
        if (valor !== null) parametros[p.nombre] = valor;
      }
    }
    this.enviando.set(true);
    this.error.set(null);
    try {
      await this.cotizaciones.cotizar(producto.codigo, parametros);
      await this.router.navigate(['/cliente/adquirir', producto.codigo, 'cotizacion']);
    } catch (err) {
      this.error.set(this.mensajeError(err));
    } finally {
      this.enviando.set(false);
    }
  }

  private unidad(p: ParametroSeguro): string {
    return p.unidad ? ` ${p.unidad}` : '';
  }

  private construirForm(
    producto: Producto,
  ): FormGroup<Record<string, FormControl | UbicacionForm>> {
    const controles: Record<string, FormControl | UbicacionForm> = {};
    for (const p of producto.parametros) {
      if (this.esUbicacion(p, producto.codigo)) {
        controles[p.nombre] = new FormGroup(
          {
            municipio: new FormControl('', { nonNullable: true }),
            zona: new FormControl('', { nonNullable: true }),
            estrato: new FormControl('', { nonNullable: true }),
          },
          ubicacionValida(p.requerido !== false),
        );
        continue;
      }
      const tipo = tipoControl(p.tipo);
      const validadores: ValidatorFn[] = [];
      if (p.requerido !== false && tipo !== 'booleano') validadores.push(Validators.required);
      if (tipo === 'numero') {
        if (p.minimo != null && p.minimo !== '') validadores.push(Validators.min(Number(p.minimo)));
        if (p.maximo != null && p.maximo !== '') validadores.push(Validators.max(Number(p.maximo)));
      } else if (tipo === 'fecha') {
        validadores.push(limiteFecha(p.minimo ?? null, p.maximo ?? null));
      }
      controles[p.nombre] = new FormControl(tipo === 'booleano' ? false : '', validadores);
    }
    return new FormGroup(controles);
  }

  private mensajeError(err: unknown): string {
    if (err instanceof SesionError) return err.message;
    if (err instanceof HttpErrorResponse) {
      if (err.status === 422) return 'Revisa los datos ingresados e intenta de nuevo.';
      if (err.status === 404) return 'No encontramos tu registro de cliente.';
      if (err.status === 503) return 'Servicio temporalmente no disponible. Intenta de nuevo.';
    }
    return 'No pudimos calcular tu cotización. Intenta de nuevo.';
  }
}
