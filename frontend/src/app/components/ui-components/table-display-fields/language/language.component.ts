import { LANGUAGES, getLanguageFlag } from '../../../../consts/languages';
import { Component, OnInit } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-language-display',
  templateUrl: './language.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './language.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class LanguageDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
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
