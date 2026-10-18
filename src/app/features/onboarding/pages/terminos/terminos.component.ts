import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TERMINOS_VERSION } from '../../../../core/constants/terminos';

@Component({
  imports: [RouterLink],
  selector: 'app-terminos',
  styleUrl: './terminos.component.scss',
  templateUrl: './terminos.component.html',
})
export class TerminosComponent {
  readonly version = TERMINOS_VERSION;
}
