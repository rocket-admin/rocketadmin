import { LANGUAGES, getLanguageFlag } from '../../../../consts/languages';
import { Component, Injectable, OnInit } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { CommonModule } from '@angular/common';

@Injectable()
@Component({
  selector: 'app-language-record-view',
  templateUrl: './language.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './language.component.css'],
  imports: [CommonModule]
})
export class LanguageRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
  static type = 'language';

  public languageName: string = '';
  public languageFlag: string = '';
  public showFlag: boolean = true;

  ngOnInit(): void {
    this.parseWidgetParams();

    if (this.value) {
      const language = LANGUAGES.find(l => l.code.toLowerCase() === this.value.toLowerCase());
      this.languageName = language ? language.name : this.value;
      if (language) {
        this.languageFlag = getLanguageFlag(language);
      }
    } else {
      this.languageName = '—';
      this.languageFlag = '';
    }
  }

  private parseWidgetParams(): void {
    if (this.widgetStructure?.widget_params) {
      try {
        const params = typeof this.widgetStructure.widget_params === 'string'
          ? JSON.parse(this.widgetStructure.widget_params)
          : this.widgetStructure.widget_params;

        if (params.show_flag !== undefined) {
          this.showFlag = params.show_flag;
        }
      } catch (e) {
        console.error('Error parsing language widget params:', e);
      }
    }
  }
}
