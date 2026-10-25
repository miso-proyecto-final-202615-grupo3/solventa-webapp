import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-polizas',
  styleUrl: '../home/home.component.scss',
  templateUrl: './polizas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolizasComponent {}
