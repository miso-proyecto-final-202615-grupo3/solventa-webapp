import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);

  /** Los portales y el playground traen su propio menú y ocupan toda la pantalla. */
  protected readonly portal = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => this.esPortal(e.urlAfterRedirects)),
    ),
    { initialValue: this.esPortal(this.router.url) },
  );

  private esPortal(url: string): boolean {
    return ['/cliente', '/operador', '/socio', '/playground'].some((ruta) => url.startsWith(ruta));
  }
}
