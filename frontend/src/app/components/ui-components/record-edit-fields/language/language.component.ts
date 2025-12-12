import { LANGUAGES, getLanguageFlag, Language } from '../../../../consts/languages';
import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { map, startWith } from 'rxjs/operators';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { FormControl } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-language',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatAutocompleteModule, MatInputModule],
  templateUrl: './language.component.html',
  styleUrls: ['./language.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LanguageEditComponent extends BaseEditFieldComponent {
  @Input() value: string;

  public languages: {value: string | null, label: string, flag: string, nativeName?: string}[] = [];
  public languageControl = new FormControl<{value: string | null, label: string, flag: string, nativeName?: string} | string>('');
  public filteredLanguages: Observable<{value: string | null, label: string, flag: string, nativeName?: string}[]>;
  public showFlag: boolean = true;
  public selectedLanguageFlag: string = '';

  originalOrder = () => { return 0; }

  ngOnInit(): void {
    super.ngOnInit();
    this.parseWidgetParams();
    this.loadLanguages();
    this.setupAutocomplete();
    this.setInitialValue();
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

  private setupAutocomplete(): void {
    this.filteredLanguages = this.languageControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        // Update flag when value changes
        if (typeof value === 'object' && value !== null) {
          this.selectedLanguageFlag = value.flag;
        } else if (typeof value === 'string') {
          // Clear flag if user is typing
          this.selectedLanguageFlag = '';
        }
        return this._filter(typeof value === 'string' ? value : (value?.label || ''));
      })
    );
  }

  private setInitialValue(): void {
    if (this.value) {
      const language = this.languages.find(l => l.value && l.value.toLowerCase() === this.value.toLowerCase());
      if (language) {
        this.languageControl.setValue(language);
        this.selectedLanguageFlag = language.flag;
      }
    }
  }

  private _filter(value: string): {value: string | null, label: string, flag: string, nativeName?: string}[] {
    const filterValue = value.toLowerCase();
    return this.languages.filter(language =>
      language.label?.toLowerCase().includes(filterValue) ||
      (language.value && language.value.toLowerCase().includes(filterValue)) ||
      (language.nativeName && language.nativeName.toLowerCase().includes(filterValue))
    );
  }

  onLanguageSelected(selectedLanguage: {value: string | null, label: string, flag: string, nativeName?: string}): void {
    this.value = selectedLanguage.value;
    this.selectedLanguageFlag = selectedLanguage.flag;
    this.onFieldChange.emit(this.value);
  }

  displayFn(language: any): string {
    if (!language) return '';
    // Only return the language label, flag is shown separately
    return typeof language === 'string' ? language : language.label;
  }

  private loadLanguages(): void {
    this.languages = LANGUAGES.map(language => ({
      value: language.code,
      label: language.name,
      flag: getLanguageFlag(language),
      nativeName: language.nativeName
    })).toSorted((a, b) => a.label.localeCompare(b.label));

    if (this.widgetStructure?.widget_params?.allow_null || this.structure?.allow_null) {
      this.languages = [{ value: null, label: '', flag: '' }, ...this.languages];
    }
  }
}
