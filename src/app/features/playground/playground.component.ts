import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ESPERA_ENTRE_LLAMADOS_SEGUNDOS,
  MAX_INTENTOS,
  PASOS_PLAYGROUND,
} from './playground.catalog';
import { EdicionPaso, PasoPlayground, ResultadoPaso } from './playground.models';
import { PlaygroundService } from './playground.service';
import { Contexto, preparar, semillas, vista } from './playground.utils';

interface Grupo {
  nombre: string;
  pasos: PasoPlayground[];
}

const pausa = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

@Component({
  selector: 'app-playground',
  imports: [JsonPipe, RouterLink],
  templateUrl: './playground.component.html',
  styleUrl: './playground.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaygroundComponent {
  private readonly servicio = inject(PlaygroundService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly pasos = PASOS_PLAYGROUND;
  protected readonly grupos: Grupo[] = this.pasos.reduce<Grupo[]>((acc, paso) => {
    const ultimo = acc.at(-1);
    if (ultimo?.nombre === paso.grupo) ultimo.pasos.push(paso);
    else acc.push({ nombre: paso.grupo, pasos: [paso] });
    return acc;
  }, []);
  protected readonly esperaSegundos = ESPERA_ENTRE_LLAMADOS_SEGUNDOS;

  protected readonly seleccionadoId = signal(this.pasos[0].id);
  protected readonly contexto = signal<Contexto>(semillas());
  protected readonly ediciones = signal<Record<string, EdicionPaso>>({});
  protected readonly resultados = signal<Record<string, ResultadoPaso>>({});
  protected readonly reproduciendo = signal(false);
  protected readonly espera = signal<number | null>(null);

  protected readonly paso = computed(
    () => this.pasos.find((p) => p.id === this.seleccionadoId()) ?? this.pasos[0],
  );
  protected readonly indice = computed(() => this.pasos.indexOf(this.paso()) + 1);
  protected readonly vista = computed(() =>
    vista(this.paso(), this.contexto(), this.ediciones()[this.paso().id]),
  );
  protected readonly resultado = computed(() => this.resultados()[this.paso().id]);
  protected readonly nombresPath = computed(() => Object.keys(this.vista().path));
  protected readonly ejecutandoManual = computed(() => this.resultado()?.estado === 'ejecutando');

  private cancelado = false;

  constructor() {
    afterRenderEffect(() => {
      this.seleccionadoId();
      this.host.nativeElement
        .querySelector('[aria-current="step"]')
        ?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  protected seleccionar(id: string): void {
    this.seleccionadoId.set(id);
  }

  protected editar(campo: 'headers' | 'body', evento: Event): void {
    const valor = (evento.target as HTMLTextAreaElement).value;
    this.actualizarEdicion({ [campo]: valor });
  }

  protected editarPath(nombre: string, evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    const previo = this.ediciones()[this.paso().id]?.path;
    this.actualizarEdicion({ path: { ...previo, [nombre]: valor } });
  }

  protected restablecer(): void {
    this.cancelado = true;
    this.contexto.set(semillas());
    this.ediciones.set({});
    this.resultados.set({});
    this.seleccionadoId.set(this.pasos[0].id);
  }

  protected async ejecutar(): Promise<void> {
    await this.ejecutarPaso(this.paso(), false);
  }

  protected async reproducir(): Promise<void> {
    if (this.reproduciendo()) return;
    this.cancelado = false;
    this.reproduciendo.set(true);
    this.contexto.set(semillas());
    this.resultados.set({});
    try {
      for (const [i, paso] of this.pasos.entries()) {
        this.seleccionar(paso.id);
        const correcto = await this.ejecutarPaso(paso, true);
        if (!correcto || this.cancelado) break;
        if (i < this.pasos.length - 1) await this.esperar();
        if (this.cancelado) break;
      }
    } finally {
      this.espera.set(null);
      this.reproduciendo.set(false);
    }
  }

  protected detener(): void {
    this.cancelado = true;
  }

  protected claseEstado(http: number | undefined): string {
    if (http === undefined) return '';
    return http >= 200 && http < 300 ? 'ok' : 'error';
  }

  private async ejecutarPaso(paso: PasoPlayground, reintentos: boolean): Promise<boolean> {
    const maxIntentos = reintentos && paso.reintentar ? MAX_INTENTOS : 1;
    for (let intento = 1; intento <= maxIntentos; intento++) {
      this.guardarResultado(paso, { estado: 'ejecutando', intento });
      const { peticion, errores } = preparar(paso, this.contexto(), this.ediciones()[paso.id]);
      if (!peticion) {
        this.guardarResultado(paso, { estado: 'error', mensaje: errores.join(' ') });
        return false;
      }

      let http;
      try {
        http = await this.servicio.enviar(peticion);
      } catch (e) {
        this.guardarResultado(paso, {
          estado: 'error',
          mensaje: e instanceof Error ? e.message : 'No se pudo enviar la petición.',
        });
        return false;
      }

      const exito = http.estado >= 200 && http.estado < 300;
      if (exito && paso.capturar && http.cuerpo && typeof http.cuerpo === 'object') {
        this.capturar(paso.capturar(http.cuerpo as Record<string, unknown>));
      }
      const pendiente = (maxIntentos > 1 && paso.reintentar?.(http)) ?? false;
      if (pendiente && intento < maxIntentos && !this.cancelado) {
        this.guardarResultado(paso, { estado: 'ejecutando', intento, http });
        await this.esperar();
        if (this.cancelado) return false;
        continue;
      }
      const mensaje = pendiente
        ? `Sin resultado definitivo tras ${maxIntentos} intentos.`
        : undefined;
      this.guardarResultado(paso, { estado: exito && !pendiente ? 'ok' : 'error', http, mensaje });
      return exito && !pendiente;
    }
    return false;
  }

  private capturar(valores: Record<string, string | undefined>): void {
    const definidos = Object.fromEntries(
      Object.entries(valores).filter((par): par is [string, string] => !!par[1]),
    );
    this.contexto.update((c) => ({ ...c, ...definidos }));
  }

  private guardarResultado(paso: PasoPlayground, resultado: ResultadoPaso): void {
    this.resultados.update((r) => ({ ...r, [paso.id]: resultado }));
  }

  private actualizarEdicion(cambio: Partial<EdicionPaso>): void {
    const id = this.paso().id;
    this.ediciones.update((e) => ({ ...e, [id]: { ...e[id], ...cambio } }));
  }

  private async esperar(): Promise<void> {
    for (let s = ESPERA_ENTRE_LLAMADOS_SEGUNDOS; s > 0 && !this.cancelado; s--) {
      this.espera.set(s);
      await pausa(1000);
    }
    this.espera.set(null);
  }
}
