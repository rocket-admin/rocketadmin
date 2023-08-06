import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';

import { MatMenuTrigger } from '@angular/material/menu';

@Component({
  selector: 'app-icon-picker',
  templateUrl: './icon-picker.component.html',
  styleUrls: ['./icon-picker.component.css']
})
export class IconPickerComponent {
  @Input() icon: string;
  @Input() defaultIcons: Array<string>;
  @Input() tooltip: string;
  @Output() onFieldChange = new EventEmitter();
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  public customIcon: string = '';

  applyIcon() {
    this.onFieldChange.emit(this.customIcon);
    this.trigger.closeMenu();
  }
}
