import { Component, Injectable, Input } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Injectable()

@Component({
  selector: 'app-edit-color',
  templateUrl: './color.component.html',
  styleUrls: ['./color.component.css'],
  imports: [MatFormFieldModule, MatInputModule, FormsModule]
})
export class ColorEditComponent extends BaseEditFieldComponent {
  @Input() value: string;

  static type = 'color';

  get isValidColor(): boolean {
    if (!this.value) return false;
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return colorRegex.test(this.value);
  }

  onColorPickerChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onFieldChange.emit(this.value);
  }

  onTextInputChange() {
    this.onFieldChange.emit(this.value);
  }
}