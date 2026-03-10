import { CommonModule } from '@angular/common';
import { Component, computed, model, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AsYouType, CountryCode as LibPhoneCountryCode, parsePhoneNumber } from 'libphonenumber-js';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

export interface CountryCode {
	code: string;
	name: string;
	dialCode: string;
	flag: string;
}

@Component({
	selector: 'app-edit-phone',
	templateUrl: './phone.component.html',
	styleUrls: ['./phone.component.css'],
	imports: [
		CommonModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		MatAutocompleteModule,
		FormsModule,
		ReactiveFormsModule,
	],
})
export class PhoneEditComponent extends BaseEditFieldComponent implements OnInit {
	readonly value = model<string>('');

	static type = 'phone';

	preferredCountries: string[] = ['US', 'GB'];
	enablePlaceholder: boolean = true;
	phoneValidation: boolean = true;

	selectedCountry: CountryCode;
	phoneNumber: string = '';
	displayPhoneNumber: string = '';
	formatter: AsYouType | null = null;

	countryControl = new FormControl<CountryCode | string | null>(null);

	private _countryControlValue = toSignal(this.countryControl.valueChanges, {
		initialValue: null as CountryCode | string | null,
	});

	filteredCountries = computed(() => {
		const value = this._countryControlValue();
		if (typeof value === 'string') {
			return this._filterCountries(value);
		} else if (value && typeof value === 'object') {
			return this.sortedCountries;
		}
		return this.sortedCountries;
	});

	countries: CountryCode[] = [
		{ code: 'AF', name: 'Afghanistan', dialCode: '+93', flag: '\u{1F1E6}\u{1F1EB}' },
		{ code: 'AL', name: 'Albania', dialCode: '+355', flag: '\u{1F1E6}\u{1F1F1}' },
		{ code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '\u{1F1E9}\u{1F1FF}' },
		{ code: 'AS', name: 'American Samoa', dialCode: '+1684', flag: '\u{1F1E6}\u{1F1F8}' },
		{ code: 'AD', name: 'Andorra', dialCode: '+376', flag: '\u{1F1E6}\u{1F1E9}' },
		{ code: 'AO', name: 'Angola', dialCode: '+244', flag: '\u{1F1E6}\u{1F1F4}' },
		{ code: 'AI', name: 'Anguilla', dialCode: '+1264', flag: '\u{1F1E6}\u{1F1EE}' },
		{ code: 'AQ', name: 'Antarctica', dialCode: '+672', flag: '\u{1F1E6}\u{1F1F6}' },
		{ code: 'AG', name: 'Antigua and Barbuda', dialCode: '+1268', flag: '\u{1F1E6}\u{1F1EC}' },
		{ code: 'AR', name: 'Argentina', dialCode: '+54', flag: '\u{1F1E6}\u{1F1F7}' },
		{ code: 'AM', name: 'Armenia', dialCode: '+374', flag: '\u{1F1E6}\u{1F1F2}' },
		{ code: 'AW', name: 'Aruba', dialCode: '+297', flag: '\u{1F1E6}\u{1F1FC}' },
		{ code: 'AU', name: 'Australia', dialCode: '+61', flag: '\u{1F1E6}\u{1F1FA}' },
		{ code: 'AT', name: 'Austria', dialCode: '+43', flag: '\u{1F1E6}\u{1F1F9}' },
		{ code: 'AZ', name: 'Azerbaijan', dialCode: '+994', flag: '\u{1F1E6}\u{1F1FF}' },
		{ code: 'BS', name: 'Bahamas', dialCode: '+1242', flag: '\u{1F1E7}\u{1F1F8}' },
		{ code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '\u{1F1E7}\u{1F1ED}' },
		{ code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '\u{1F1E7}\u{1F1E9}' },
		{ code: 'BB', name: 'Barbados', dialCode: '+1246', flag: '\u{1F1E7}\u{1F1E7}' },
		{ code: 'BY', name: 'Belarus', dialCode: '+375', flag: '\u{1F1E7}\u{1F1FE}' },
		{ code: 'BE', name: 'Belgium', dialCode: '+32', flag: '\u{1F1E7}\u{1F1EA}' },
		{ code: 'BZ', name: 'Belize', dialCode: '+501', flag: '\u{1F1E7}\u{1F1FF}' },
		{ code: 'BJ', name: 'Benin', dialCode: '+229', flag: '\u{1F1E7}\u{1F1EF}' },
		{ code: 'BM', name: 'Bermuda', dialCode: '+1441', flag: '\u{1F1E7}\u{1F1F2}' },
		{ code: 'BT', name: 'Bhutan', dialCode: '+975', flag: '\u{1F1E7}\u{1F1F9}' },
		{ code: 'BO', name: 'Bolivia', dialCode: '+591', flag: '\u{1F1E7}\u{1F1F4}' },
		{ code: 'BA', name: 'Bosnia and Herzegovina', dialCode: '+387', flag: '\u{1F1E7}\u{1F1E6}' },
		{ code: 'BW', name: 'Botswana', dialCode: '+267', flag: '\u{1F1E7}\u{1F1FC}' },
		{ code: 'BR', name: 'Brazil', dialCode: '+55', flag: '\u{1F1E7}\u{1F1F7}' },
		{ code: 'IO', name: 'British Indian Ocean Territory', dialCode: '+246', flag: '\u{1F1EE}\u{1F1F4}' },
		{ code: 'BN', name: 'Brunei', dialCode: '+673', flag: '\u{1F1E7}\u{1F1F3}' },
		{ code: 'BG', name: 'Bulgaria', dialCode: '+359', flag: '\u{1F1E7}\u{1F1EC}' },
		{ code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '\u{1F1E7}\u{1F1EB}' },
		{ code: 'BI', name: 'Burundi', dialCode: '+257', flag: '\u{1F1E7}\u{1F1EE}' },
		{ code: 'KH', name: 'Cambodia', dialCode: '+855', flag: '\u{1F1F0}\u{1F1ED}' },
		{ code: 'CM', name: 'Cameroon', dialCode: '+237', flag: '\u{1F1E8}\u{1F1F2}' },
		{ code: 'CA', name: 'Canada', dialCode: '+1', flag: '\u{1F1E8}\u{1F1E6}' },
		{ code: 'CV', name: 'Cape Verde', dialCode: '+238', flag: '\u{1F1E8}\u{1F1FB}' },
		{ code: 'KY', name: 'Cayman Islands', dialCode: '+1345', flag: '\u{1F1F0}\u{1F1FE}' },
		{ code: 'CF', name: 'Central African Republic', dialCode: '+236', flag: '\u{1F1E8}\u{1F1EB}' },
		{ code: 'TD', name: 'Chad', dialCode: '+235', flag: '\u{1F1F9}\u{1F1E9}' },
		{ code: 'CL', name: 'Chile', dialCode: '+56', flag: '\u{1F1E8}\u{1F1F1}' },
		{ code: 'CN', name: 'China', dialCode: '+86', flag: '\u{1F1E8}\u{1F1F3}' },
		{ code: 'CO', name: 'Colombia', dialCode: '+57', flag: '\u{1F1E8}\u{1F1F4}' },
		{ code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '\u{1F1E8}\u{1F1F7}' },
		{ code: 'HR', name: 'Croatia', dialCode: '+385', flag: '\u{1F1ED}\u{1F1F7}' },
		{ code: 'CU', name: 'Cuba', dialCode: '+53', flag: '\u{1F1E8}\u{1F1FA}' },
		{ code: 'CY', name: 'Cyprus', dialCode: '+357', flag: '\u{1F1E8}\u{1F1FE}' },
		{ code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '\u{1F1E8}\u{1F1FF}' },
		{ code: 'DK', name: 'Denmark', dialCode: '+45', flag: '\u{1F1E9}\u{1F1F0}' },
		{ code: 'DO', name: 'Dominican Republic', dialCode: '+1', flag: '\u{1F1E9}\u{1F1F4}' },
		{ code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '\u{1F1EA}\u{1F1E8}' },
		{ code: 'EG', name: 'Egypt', dialCode: '+20', flag: '\u{1F1EA}\u{1F1EC}' },
		{ code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '\u{1F1F8}\u{1F1FB}' },
		{ code: 'EE', name: 'Estonia', dialCode: '+372', flag: '\u{1F1EA}\u{1F1EA}' },
		{ code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '\u{1F1EA}\u{1F1F9}' },
		{ code: 'FI', name: 'Finland', dialCode: '+358', flag: '\u{1F1EB}\u{1F1EE}' },
		{ code: 'FR', name: 'France', dialCode: '+33', flag: '\u{1F1EB}\u{1F1F7}' },
		{ code: 'DE', name: 'Germany', dialCode: '+49', flag: '\u{1F1E9}\u{1F1EA}' },
		{ code: 'GH', name: 'Ghana', dialCode: '+233', flag: '\u{1F1EC}\u{1F1ED}' },
		{ code: 'GR', name: 'Greece', dialCode: '+30', flag: '\u{1F1EC}\u{1F1F7}' },
		{ code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '\u{1F1EC}\u{1F1F9}' },
		{ code: 'HN', name: 'Honduras', dialCode: '+504', flag: '\u{1F1ED}\u{1F1F3}' },
		{ code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '\u{1F1ED}\u{1F1F0}' },
		{ code: 'HU', name: 'Hungary', dialCode: '+36', flag: '\u{1F1ED}\u{1F1FA}' },
		{ code: 'IS', name: 'Iceland', dialCode: '+354', flag: '\u{1F1EE}\u{1F1F8}' },
		{ code: 'IN', name: 'India', dialCode: '+91', flag: '\u{1F1EE}\u{1F1F3}' },
		{ code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '\u{1F1EE}\u{1F1E9}' },
		{ code: 'IR', name: 'Iran', dialCode: '+98', flag: '\u{1F1EE}\u{1F1F7}' },
		{ code: 'IQ', name: 'Iraq', dialCode: '+964', flag: '\u{1F1EE}\u{1F1F6}' },
		{ code: 'IE', name: 'Ireland', dialCode: '+353', flag: '\u{1F1EE}\u{1F1EA}' },
		{ code: 'IL', name: 'Israel', dialCode: '+972', flag: '\u{1F1EE}\u{1F1F1}' },
		{ code: 'IT', name: 'Italy', dialCode: '+39', flag: '\u{1F1EE}\u{1F1F9}' },
		{ code: 'JM', name: 'Jamaica', dialCode: '+1876', flag: '\u{1F1EF}\u{1F1F2}' },
		{ code: 'JP', name: 'Japan', dialCode: '+81', flag: '\u{1F1EF}\u{1F1F5}' },
		{ code: 'JO', name: 'Jordan', dialCode: '+962', flag: '\u{1F1EF}\u{1F1F4}' },
		{ code: 'KZ', name: 'Kazakhstan', dialCode: '+7', flag: '\u{1F1F0}\u{1F1FF}' },
		{ code: 'KE', name: 'Kenya', dialCode: '+254', flag: '\u{1F1F0}\u{1F1EA}' },
		{ code: 'KR', name: 'South Korea', dialCode: '+82', flag: '\u{1F1F0}\u{1F1F7}' },
		{ code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '\u{1F1F0}\u{1F1FC}' },
		{ code: 'LV', name: 'Latvia', dialCode: '+371', flag: '\u{1F1F1}\u{1F1FB}' },
		{ code: 'LB', name: 'Lebanon', dialCode: '+961', flag: '\u{1F1F1}\u{1F1E7}' },
		{ code: 'LT', name: 'Lithuania', dialCode: '+370', flag: '\u{1F1F1}\u{1F1F9}' },
		{ code: 'LU', name: 'Luxembourg', dialCode: '+352', flag: '\u{1F1F1}\u{1F1FA}' },
		{ code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '\u{1F1F2}\u{1F1FE}' },
		{ code: 'MX', name: 'Mexico', dialCode: '+52', flag: '\u{1F1F2}\u{1F1FD}' },
		{ code: 'MA', name: 'Morocco', dialCode: '+212', flag: '\u{1F1F2}\u{1F1E6}' },
		{ code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '\u{1F1F3}\u{1F1F1}' },
		{ code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '\u{1F1F3}\u{1F1FF}' },
		{ code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '\u{1F1F3}\u{1F1EC}' },
		{ code: 'NO', name: 'Norway', dialCode: '+47', flag: '\u{1F1F3}\u{1F1F4}' },
		{ code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '\u{1F1F5}\u{1F1F0}' },
		{ code: 'PA', name: 'Panama', dialCode: '+507', flag: '\u{1F1F5}\u{1F1E6}' },
		{ code: 'PE', name: 'Peru', dialCode: '+51', flag: '\u{1F1F5}\u{1F1EA}' },
		{ code: 'PH', name: 'Philippines', dialCode: '+63', flag: '\u{1F1F5}\u{1F1ED}' },
		{ code: 'PL', name: 'Poland', dialCode: '+48', flag: '\u{1F1F5}\u{1F1F1}' },
		{ code: 'PT', name: 'Portugal', dialCode: '+351', flag: '\u{1F1F5}\u{1F1F9}' },
		{ code: 'PR', name: 'Puerto Rico', dialCode: '+1787', flag: '\u{1F1F5}\u{1F1F7}' },
		{ code: 'QA', name: 'Qatar', dialCode: '+974', flag: '\u{1F1F6}\u{1F1E6}' },
		{ code: 'RO', name: 'Romania', dialCode: '+40', flag: '\u{1F1F7}\u{1F1F4}' },
		{ code: 'RU', name: 'Russia', dialCode: '+7', flag: '\u{1F1F7}\u{1F1FA}' },
		{ code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '\u{1F1F8}\u{1F1E6}' },
		{ code: 'RS', name: 'Serbia', dialCode: '+381', flag: '\u{1F1F7}\u{1F1F8}' },
		{ code: 'SG', name: 'Singapore', dialCode: '+65', flag: '\u{1F1F8}\u{1F1EC}' },
		{ code: 'SK', name: 'Slovakia', dialCode: '+421', flag: '\u{1F1F8}\u{1F1F0}' },
		{ code: 'SI', name: 'Slovenia', dialCode: '+386', flag: '\u{1F1F8}\u{1F1EE}' },
		{ code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '\u{1F1FF}\u{1F1E6}' },
		{ code: 'ES', name: 'Spain', dialCode: '+34', flag: '\u{1F1EA}\u{1F1F8}' },
		{ code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '\u{1F1F1}\u{1F1F0}' },
		{ code: 'SE', name: 'Sweden', dialCode: '+46', flag: '\u{1F1F8}\u{1F1EA}' },
		{ code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '\u{1F1E8}\u{1F1ED}' },
		{ code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '\u{1F1F9}\u{1F1FC}' },
		{ code: 'TH', name: 'Thailand', dialCode: '+66', flag: '\u{1F1F9}\u{1F1ED}' },
		{ code: 'TR', name: 'Turkey', dialCode: '+90', flag: '\u{1F1F9}\u{1F1F7}' },
		{ code: 'UA', name: 'Ukraine', dialCode: '+380', flag: '\u{1F1FA}\u{1F1E6}' },
		{ code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '\u{1F1E6}\u{1F1EA}' },
		{ code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '\u{1F1EC}\u{1F1E7}' },
		{ code: 'US', name: 'United States', dialCode: '+1', flag: '\u{1F1FA}\u{1F1F8}' },
		{ code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '\u{1F1FA}\u{1F1FE}' },
		{ code: 'UZ', name: 'Uzbekistan', dialCode: '+998', flag: '\u{1F1FA}\u{1F1FF}' },
		{ code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '\u{1F1FB}\u{1F1EA}' },
		{ code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '\u{1F1FB}\u{1F1F3}' },
		{ code: 'ZM', name: 'Zambia', dialCode: '+260', flag: '\u{1F1FF}\u{1F1F2}' },
		{ code: 'ZW', name: 'Zimbabwe', dialCode: '+263', flag: '\u{1F1FF}\u{1F1FC}' },
	];

	ngOnInit(): void {
		super.ngOnInit();
		this.configureFromWidgetParams();
		this.initializePhoneNumber();
	}

	configureFromWidgetParams(): void {
		const ws = this.widgetStructure();
		if (ws?.widget_params) {
			const params = ws.widget_params;

			if (params.preferred_countries && Array.isArray(params.preferred_countries)) {
				this.preferredCountries = params.preferred_countries;
			}

			if (typeof params.enable_placeholder === 'boolean') {
				this.enablePlaceholder = params.enable_placeholder;
			}

			if (typeof params.phone_validation === 'boolean') {
				this.phoneValidation = params.phone_validation;
			}
		}
	}

	_filterCountries(value: string): CountryCode[] {
		const filterValue = value.toLowerCase();
		return this.sortedCountries.filter(
			(country) =>
				country.name.toLowerCase().includes(filterValue) ||
				country.code.toLowerCase().includes(filterValue) ||
				country.dialCode.includes(filterValue),
		);
	}

	displayCountryFn(country: CountryCode): string {
		return country ? `${country.flag} ${country.name} ${country.dialCode}` : '';
	}

	onCountrySelected(country: CountryCode): void {
		this.selectedCountry = country;
		this.initializeFormatter();
		this.formatAndUpdatePhoneNumber();
	}

	initializeFormatter(): void {
		if (this.selectedCountry) {
			this.formatter = new AsYouType(this.selectedCountry.code as LibPhoneCountryCode);
		}
	}

	onCountryChange(): void {
		this.initializeFormatter();
		this.formatAndUpdatePhoneNumber();
	}

	onPhoneNumberChange(): void {
		if (this.displayPhoneNumber.startsWith('+')) {
			this.detectCountryFromInput();
		} else {
			this.formatAndUpdatePhoneNumber();
		}
	}

	get sortedCountries(): CountryCode[] {
		const preferred = this.countries.filter((c) => this.preferredCountries.includes(c.code));
		const others = this.countries.filter((c) => !this.preferredCountries.includes(c.code));
		return [...preferred, ...others];
	}

	get placeholder(): string {
		if (!this.enablePlaceholder) return '';
		return this.selectedCountry ? `Phone number for ${this.selectedCountry.name}` : 'Phone number';
	}

	getPhoneNumberPlaceholder(): string {
		if (!this.enablePlaceholder) return '';
		if (this.selectedCountry) {
			return `Local number or ${this.selectedCountry.dialCode}1234567890`;
		}
		return 'Enter +1234567890 or select country';
	}

	getExamplePhoneNumber(): string {
		if (!this.selectedCountry) return '';

		const exampleNumbers: { [key: string]: string } = {
			US: '(202) 456-1111',
			GB: '020 7946 0958',
			CA: '(416) 555-1234',
			AU: '(02) 1234 5678',
			DE: '030 12345678',
			FR: '01 23 45 67 89',
		};

		return exampleNumbers[this.selectedCountry.code] || `${this.selectedCountry.dialCode} 123 4567`;
	}

	isValidPhoneNumber(): boolean {
		if (!this.phoneValidation) return true;
		if (!this.displayPhoneNumber) return true;

		try {
			let phoneNumber;

			if (this.displayPhoneNumber.startsWith('+')) {
				phoneNumber = parsePhoneNumber(this.displayPhoneNumber);
			} else if (this.selectedCountry) {
				phoneNumber = parsePhoneNumber(this.displayPhoneNumber, this.selectedCountry.code as LibPhoneCountryCode);
			} else {
				return false;
			}

			return phoneNumber ? phoneNumber.isValid() : false;
		} catch (_error) {
			return false;
		}
	}

	private initializePhoneNumber(): void {
		const currentValue = this.value();
		if (currentValue) {
			this.parseExistingPhoneNumber(currentValue);
		} else {
			this.setDefaultCountry();
			this.displayPhoneNumber = '';
		}
	}

	private parseExistingPhoneNumber(fullNumber: string): void {
		let phoneNumber;

		try {
			phoneNumber = parsePhoneNumber(fullNumber);
		} catch (_error) {
			// Will try with default country below
		}

		if (!phoneNumber || !phoneNumber.country) {
			try {
				const defaultCountryCode = this.preferredCountries[0] || 'US';
				phoneNumber = parsePhoneNumber(fullNumber, defaultCountryCode as LibPhoneCountryCode);
			} catch (error) {
				console.warn('Failed to parse with default country as well:', error);
			}
		}

		if (phoneNumber?.country) {
			const country = this.countries.find((c) => c.code === phoneNumber.country);
			if (country) {
				this.selectedCountry = country;
				this.countryControl.setValue(country);
				this.phoneNumber = phoneNumber.nationalNumber;
				this.displayPhoneNumber = phoneNumber.formatNational();
				this.initializeFormatter();
				return;
			} else {
				console.warn('Country not found in list:', phoneNumber.country);
			}
		}

		this.setDefaultCountry();
		this.phoneNumber = fullNumber.replace(/\D/g, '');

		if (this.formatter && this.phoneNumber) {
			this.formatter.reset();
			this.displayPhoneNumber = this.formatter.input(this.phoneNumber);
		} else {
			this.displayPhoneNumber = fullNumber;
		}
	}

	private setDefaultCountry(): void {
		this.selectedCountry = this.countries.find((c) => c.code === this.preferredCountries[0]) || this.countries[0];
		this.countryControl.setValue(this.selectedCountry);
		this.initializeFormatter();
	}

	private formatAndUpdatePhoneNumber(): void {
		if (!this.displayPhoneNumber) {
			this.phoneNumber = '';
			this.value.set('');
			this.onFieldChange.emit(this.value());
			return;
		}

		if (this.formatter && !this.displayPhoneNumber.startsWith('+')) {
			this.formatter.reset();
			const formatted = this.formatter.input(this.displayPhoneNumber);
			this.displayPhoneNumber = formatted;

			this.phoneNumber = this.displayPhoneNumber.replace(/\D/g, '');
		} else {
			this.phoneNumber = this.displayPhoneNumber.replace(/\D/g, '');
		}

		this.updateFullPhoneNumber();
	}

	private detectCountryFromInput(): void {
		if (!this.displayPhoneNumber.startsWith('+')) {
			return;
		}

		try {
			const phoneNumber = parsePhoneNumber(this.displayPhoneNumber);
			if (phoneNumber?.country) {
				const detectedCountry = this.countries.find((c) => c.code === phoneNumber.country);
				if (detectedCountry) {
					this.selectedCountry = detectedCountry;
					this.countryControl.setValue(detectedCountry);
					this.phoneNumber = phoneNumber.nationalNumber;
					this.displayPhoneNumber = phoneNumber.formatNational();
					this.initializeFormatter();
					this.updateFullPhoneNumber();
					return;
				}
			}
		} catch (error) {
			console.warn('Could not detect country from input:', this.displayPhoneNumber, error);
		}

		this.phoneNumber = this.displayPhoneNumber.replace(/\D/g, '');
		this.updateFullPhoneNumber();
	}

	private updateFullPhoneNumber(): void {
		if (!this.displayPhoneNumber && !this.phoneNumber) {
			this.value.set('');
			this.onFieldChange.emit(this.value());
			return;
		}

		try {
			let phoneNumber;

			if (this.displayPhoneNumber.startsWith('+')) {
				phoneNumber = parsePhoneNumber(this.displayPhoneNumber);
			} else if (this.selectedCountry && this.displayPhoneNumber) {
				phoneNumber = parsePhoneNumber(this.displayPhoneNumber, this.selectedCountry.code as LibPhoneCountryCode);
			}

			if (phoneNumber?.isValid()) {
				this.value.set(phoneNumber.number);
			} else {
				this.value.set(this.displayPhoneNumber.replace(/\s/g, ''));
			}
		} catch (error) {
			console.warn('Error formatting phone number:', error);
			this.value.set(this.displayPhoneNumber.replace(/\s/g, ''));
		}

		this.onFieldChange.emit(this.value());
	}
}
