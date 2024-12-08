import { Component, Input } from '@angular/core';
import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-url',
  templateUrl: './url.component.html',
  styleUrl: './url.component.css'
})
export class UrlRowComponent extends BaseRowFieldComponent {
  @Input() value: string;
}
