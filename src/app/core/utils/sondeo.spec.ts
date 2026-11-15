import { sondear } from './sondeo';

describe('sondear', () => {
  afterEach(() => vi.useRealTimers());

  it('consulta cada cinco segundos y termina cuando el estado está listo', async () => {
    vi.useFakeTimers();
    const consultar = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const resultado = sondear(consultar, Boolean, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(4999);
    expect(consultar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await resultado).toBe(true);
    expect(consultar).toHaveBeenCalledTimes(2);
  });

  it('deja de consultar tras doce intentos pendientes', async () => {
    vi.useFakeTimers();
    const consultar = vi.fn().mockResolvedValue(false);
    const resultado = sondear(consultar, Boolean, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(55000);
    expect(await resultado).toBeNull();
    expect(consultar).toHaveBeenCalledTimes(12);
  });

  it('cancela la espera cuando se abandona la pantalla', async () => {
    vi.useFakeTimers();
    const cancelar = new AbortController();
    const consultar = vi.fn().mockResolvedValue(false);
    const resultado = sondear(consultar, Boolean, cancelar.signal);
    const capturado = resultado.catch(() => null);
    await vi.advanceTimersByTimeAsync(0);
    cancelar.abort();
    await capturado;
    await vi.advanceTimersByTimeAsync(10000);
    expect(consultar).toHaveBeenCalledTimes(1);
  });
});
