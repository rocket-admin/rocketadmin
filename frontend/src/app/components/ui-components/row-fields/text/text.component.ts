import { Component, EventEmitter, Injectable, Input, OnInit, Output } from '@angular/core';

import { normalizeFieldName } from '../../../../lib/normalize';

@Injectable()

@Component({
  selector: 'app-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.css']
})
export class TextComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() disabled: boolean;

  @Output() onFieldChange = new EventEmitter();

  static type = 'text';
  public normalizedLabel: string;

  constructor() { }

  ngOnInit(): void {
    console.log('this.readonly');
    console.log(this.readonly);
    console.log('this.disabled');
    console.log(this.disabled);
    this.normalizedLabel = normalizeFieldName(this.label);
  }

}
