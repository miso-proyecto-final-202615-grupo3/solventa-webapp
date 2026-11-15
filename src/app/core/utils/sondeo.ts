import { Observable, firstValueFrom, fromEvent, takeUntil, timer } from 'rxjs';

const INTERVALO_MS = 5000;
const MAX_CONSULTAS = 12;

export async function consultaActiva<T>(
  consulta: Observable<T>,
  cancelacion: AbortSignal,
): Promise<T> {
  if (cancelacion.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
  return firstValueFrom(consulta.pipe(takeUntil(fromEvent(cancelacion, 'abort'))));
}

export async function sondear<T>(
  consultar: () => Promise<T>,
  terminado: (valor: T) => boolean,
  cancelacion: AbortSignal,
): Promise<T | null> {
  for (let intento = 0; intento < MAX_CONSULTAS && !cancelacion.aborted; intento++) {
    const resultado = await consultar();
    if (terminado(resultado)) return resultado;
    if (intento < MAX_CONSULTAS - 1) {
      await consultaActiva(timer(INTERVALO_MS), cancelacion);
    }
  }
  return null;
}
