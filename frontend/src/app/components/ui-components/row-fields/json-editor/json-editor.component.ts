import { Input, Output, OnInit, EventEmitter, Component } from '@angular/core';
import { normalizeFieldName } from '../../../../lib/normalize';
import * as JSON5 from 'json5';

@Component({
  selector: 'app-json-editor',
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.css']
})
export class JsonEditorComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: Object;
  @Input() required: boolean;
  @Input() readonly: boolean;

  @Output() onFieldChange = new EventEmitter();

  public normalizedLabel: string;

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
    console.log(this.value);
    this.value = JSON.stringify(this.value);
  }
}
