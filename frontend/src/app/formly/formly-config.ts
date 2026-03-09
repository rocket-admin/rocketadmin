import { FormlyModule } from '@ngx-formly/core';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { FormlyMatSelectModule } from '@ngx-formly/material/select';
import { FormlyMatToggleModule } from '@ngx-formly/material/toggle';
import { CheckboxType } from './checkbox.type';
import { ColorPaletteType } from './color-palette.type';
import { ColorPickerType } from './color-picker.type';
import { ExpansionPanelWrapper } from './expansion-panel.wrapper';
import { PaletteColorInputType } from './palette-color-input.type';
import { RepeatSectionType } from './repeat-section.type';

export const FORMLY_IMPORTS = [
	FormlyMaterialModule,
	FormlyMatSelectModule,
	FormlyMatToggleModule,
	FormlyModule.forRoot({
		types: [
			{ name: 'checkbox', component: CheckboxType, wrappers: [] },
			{ name: 'repeat', component: RepeatSectionType },
			{ name: 'color-picker', component: ColorPickerType },
			{ name: 'color-palette', component: ColorPaletteType },
			{ name: 'palette-color-input', component: PaletteColorInputType },
		],
		wrappers: [{ name: 'expansion-panel', component: ExpansionPanelWrapper }],
		validationMessages: [{ name: 'required', message: 'This field is required' }],
	}),
];
