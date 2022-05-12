import { Input, Output, OnInit, EventEmitter, Component, ViewChild } from '@angular/core';
import { JsonEditorComponent as JsonEditor, JsonEditorOptions } from 'ang-jsoneditor';
import { normalizeFieldName } from '../../../../lib/normalize';

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

  @ViewChild(JsonEditor, { static: false }) editor: JsonEditor;

  public normalizedLabel: string;
  public editorOptions: JsonEditorOptions;

  constructor() {
    this.editorOptions = new JsonEditorOptions();
  }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
  }

  onJSONchange(event) {
    this.onFieldChange.emit(event);
  }

}
