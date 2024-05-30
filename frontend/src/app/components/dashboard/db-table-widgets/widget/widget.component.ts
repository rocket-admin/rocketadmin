import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

import { Widget } from 'src/app/models/table';

@Component({
  selector: 'app-widget',
  // standalone: true,
  // imports: [],
  templateUrl: './widget.component.html',
  styleUrl: './widget.component.css'
})
export class WidgetComponent implements OnInit, OnChanges {
  @Input() index: number;
  @Input() widget: Widget;
  @Input() widgetType: string;
  @Input() fields: string[];
  @Input() widgetTypes: string[];
  @Input() isReadonlyParams: boolean;

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
