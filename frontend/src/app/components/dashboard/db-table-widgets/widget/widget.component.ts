import { CUSTOM_ELEMENTS_SCHEMA, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

import { CodeEditorModule } from '@ngstack/code-editor';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Widget } from 'src/app/models/table';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-widget',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    CodeEditorModule
  ],
  templateUrl: './widget.component.html',
  styleUrl: './widget.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WidgetComponent implements OnInit, OnChanges {
  @Input() index: number;
  @Input() widget: Widget;
  @Input() widgetType: string;
  @Input() fields: string[];
  @Input() widgetTypes: string[];
  @Input() isReadonlyParams: boolean;
  @Input() codeEditorTheme: 'vs' | 'vs-dark';

  @Output() onSelectWidgetField = new EventEmitter<string>();
  @Output() onWidgetTypeChange = new EventEmitter<string>();
  @Output() onWidgetParamsChange = new EventEmitter<{ value: any, fieldName: string }>();
  @Output() onWidgetDelete = new EventEmitter<string>();

  public mutableWidgetParams: {
    language: string;
    uri: string;
    value: any;
  } = {
    language: 'json',
    uri: '',
    value: {}
  };

  public paramsEditorOptions = {
    minimap: { enabled: false },
    lineNumbersMinChars:  3,
    folding: false,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };

  ngOnInit(): void {
    this.mutableWidgetParams = {
      language: 'json',
      uri: `widget-params-${this.index}.json`,
      value: this.widget.widget_params
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.widgetType?.currentValue) {
      this.mutableWidgetParams = {
        ...this.mutableWidgetParams,
        value: this.widget.widget_params,
      }
      console.log(this.mutableWidgetParams);
    }
  }
};
