import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, input, OnInit, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TableField, TableForeignKey, WidgetStructure } from 'src/app/models/table';
import { getLanguageFlag, LANGUAGES } from '../../../../consts/languages';
import { normalizeFieldName } from '../../../../lib/normalize';

interface LanguageOption {
	value: string | null;
	label: string;
	flag: string;
	nativeName?: string;
}

@Component({
	selector: 'app-edit-language',
	imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatAutocompleteModule, MatInputModule],
	templateUrl: './language.component.html',
	styleUrls: ['./language.component.css'],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class LanguageEditComponent implements OnInit {
	readonly key = input<string>();
	readonly label = input<string>();
	readonly required = input<boolean>(false);
	readonly readonly = input<boolean>(false);
	readonly structure = input<TableField>();
	readonly disabled = input<boolean>(false);
	readonly widgetStructure = input<WidgetStructure>();
	readonly relations = input<TableForeignKey>();
	readonly value = input<string>();

	readonly onFieldChange = output<string | null>();

	readonly normalizedLabel = computed(() => normalizeFieldName(this.label() || ''));

	readonly showFlag = computed(() => {
		const ws = this.widgetStructure();
		if (!ws?.widget_params) return true;
		try {
			const params = typeof ws.widget_params === 'string' ? JSON.parse(ws.widget_params) : ws.widget_params;
			return params.show_flag !== undefined ? params.show_flag : true;
		} catch {
			return true;
		}
	});

	public languages: LanguageOption[] = [];
	public languageControl = new FormControl<LanguageOption | string>('');
	public selectedLanguageFlag = computed(() => {
		const value = this._controlValue();
		if (typeof value === 'object' && value !== null) {
			return value.flag;
		}
		return '';
	});

	private _controlValue = toSignal(this.languageControl.valueChanges, { initialValue: '' as LanguageOption | string });

	public filteredLanguages = computed(() => {
		const value = this._controlValue();
		return this._filter(typeof value === 'string' ? value : value?.label || '');
	});

	originalOrder = () => {
		return 0;
	};

	ngOnInit(): void {
		this.loadLanguages();
		this.setInitialValue();
	}

	displayFn(language: LanguageOption | string): string {
		if (!language) return '';
		return typeof language === 'string' ? language : language.label;
	}

	onLanguageSelected(selectedLanguage: LanguageOption): void {
		this.onFieldChange.emit(selectedLanguage.value);
	}

	private setInitialValue(): void {
		const val = this.value();
		if (val) {
			const language = this.languages.find((l) => l.value && l.value.toLowerCase() === val.toLowerCase());
			if (language) {
				this.languageControl.setValue(language);
			}
		}
	}

	private _filter(value: string): LanguageOption[] {
		const filterValue = value.toLowerCase();
		return this.languages.filter(
			(language) =>
				language.label?.toLowerCase().includes(filterValue) ||
				language.value?.toLowerCase().includes(filterValue) ||
				language.nativeName?.toLowerCase().includes(filterValue),
		);
	}

	private loadLanguages(): void {
		this.languages = LANGUAGES.map((language) => ({
			value: language.code,
			label: language.name,
			flag: getLanguageFlag(language),
			nativeName: language.nativeName,
		})).toSorted((a, b) => a.label.localeCompare(b.label));

		const ws = this.widgetStructure();
		if (ws?.widget_params?.allow_null || this.structure()?.allow_null) {
			this.languages = [{ value: null, label: '', flag: '' }, ...this.languages];
		}
	}
}
