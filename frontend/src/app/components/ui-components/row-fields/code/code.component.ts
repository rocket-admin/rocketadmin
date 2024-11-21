import { Component, Input } from '@angular/core';
import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-code',
  templateUrl: './code.component.html',
  styleUrl: './code.component.css'
})
export class CodeRowComponent extends BaseRowFieldComponent {
  @Input() value;

  public mutableCodeModel: Object;
  public codeEditorOptions = {
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };

  ngOnInit(): void {
    super.ngOnInit();
    this.mutableCodeModel = {
      language: `${this.widgetStructure.widget_params.language}`,
      uri: `${this.label}.json`,
      value: this.value
    }
  }
}
