import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-icon-picker',
  templateUrl: './icon-picker.component.html',
  styleUrls: ['./icon-picker.component.css'],
  imports: [
    CommonModule,
    MatMenuModule,
    MatIconModule,
    FormsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class IconPickerComponent {
  @Input() resetButtonShown: boolean;
  @Input() icon: string;
  @Input() defaultIcons: Array<string>;
  @Input() tooltip: string;
  @Output() onFieldChange = new EventEmitter();
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  public customIcon: string = '';

  constructor() { console.log(this.resetButtonShown, 'resetButtonShown'); }

  ngOnInit() {
    this.customIcon = this.icon || '';
  }

  applyIcon() {
    this.onFieldChange.emit(this.customIcon);
    this.trigger.closeMenu();
  }

  resetIcon() {
    this.onFieldChange.emit(null);
    this.trigger.closeMenu();
  }
}
