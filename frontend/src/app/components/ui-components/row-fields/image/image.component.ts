import { Component, Input } from '@angular/core';
import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-image',
  templateUrl: './image.component.html',
  styleUrl: './image.component.css'
})
export class ImageRowComponent extends BaseRowFieldComponent {
  @Input() value: string;
}
