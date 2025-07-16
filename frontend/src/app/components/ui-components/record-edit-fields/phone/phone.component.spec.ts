import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CommonModule } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PhoneRowComponent } from './phone.component';

describe('PhoneRowComponent', () => {
  let component: PhoneRowComponent;
  let fixture: ComponentFixture<PhoneRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PhoneRowComponent,
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatAutocompleteModule,
        NoopAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhoneRowComponent);
    component = fixture.componentInstance;
    
    // Set basic required properties
    component.label = 'Phone';
    component.key = 'phone';
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('US Phone Number Formatting', () => {
    beforeEach(() => {
      // Set US as selected country
      const usCountry = component.countries.find(c => c.code === 'US');
      component.selectedCountry = usCountry!;
      component.countryControl.setValue(usCountry!);
      component.initializeFormatter();
    });

    it('should format US phone number in E164 format when user enters local number', () => {
      const localNumber = '(202) 456-1111';
      component.displayPhoneNumber = localNumber;
      
      component.onPhoneNumberChange();
      
      expect(component.value).toBe('+12024561111');
    });

    it('should format US phone number in E164 format when user enters raw digits', () => {
      const rawDigits = '2024561111';
      component.displayPhoneNumber = rawDigits;
      
      component.onPhoneNumberChange();
      
      expect(component.value).toBe('+12024561111');
    });

    it('should handle US phone number with different formatting', () => {
      const formattedNumber = '202.456.1111';
      component.displayPhoneNumber = formattedNumber;
      
      component.onPhoneNumberChange();
      
      expect(component.value).toBe('+12024561111');
    });

    it('should handle US phone number with country code already included', () => {
      const withCountryCode = '+1 202 456 1111';
      component.displayPhoneNumber = withCountryCode;
      
      component.onPhoneNumberChange();
      
      expect(component.value).toBe('+12024561111');
    });

    it('should not format invalid US phone number', () => {
      const invalidNumber = '123';
      component.displayPhoneNumber = invalidNumber;
      
      component.onPhoneNumberChange();
      
      // Should either be empty or the cleaned input, but not a malformed international number
      expect(component.value).not.toMatch(/^\+1123$/);
    });
  });

  describe('International Phone Number Formatting', () => {
    it('should format UK phone number in E164 format', () => {
      const ukCountry = component.countries.find(c => c.code === 'GB');
      component.selectedCountry = ukCountry!;
      component.countryControl.setValue(ukCountry!);
      component.initializeFormatter();
      
      const localNumber = '020 7946 0958';
      component.displayPhoneNumber = localNumber;
      
      component.onPhoneNumberChange();
      
      expect(component.value).toBe('+442079460958');
    });

    it('should format German phone number in E164 format', () => {
      const deCountry = component.countries.find(c => c.code === 'DE');
      component.selectedCountry = deCountry!;
      component.countryControl.setValue(deCountry!);
      component.initializeFormatter();
      
      const localNumber = '030 12345678';
      component.displayPhoneNumber = localNumber;
      
      component.onPhoneNumberChange();
      
      expect(component.value).toBe('+493012345678');
    });
  });

  describe('Phone Number Validation', () => {
    beforeEach(() => {
      component.phoneValidation = true;
    });

    it('should validate US phone number as valid', () => {
      const usCountry = component.countries.find(c => c.code === 'US');
      component.selectedCountry = usCountry!;
      component.displayPhoneNumber = '(202) 456-1111';
      
      const isValid = component.isValidPhoneNumber();
      
      expect(isValid).toBe(true);
    });

    it('should validate international phone number as valid', () => {
      component.displayPhoneNumber = '+442079460958';
      
      const isValid = component.isValidPhoneNumber();
      
      expect(isValid).toBe(true);
    });

    it('should validate invalid phone number as invalid', () => {
      const usCountry = component.countries.find(c => c.code === 'US');
      component.selectedCountry = usCountry!;
      component.displayPhoneNumber = '123';
      
      const isValid = component.isValidPhoneNumber();
      
      expect(isValid).toBe(false);
    });

    it('should treat empty phone number as valid when validation is enabled', () => {
      component.displayPhoneNumber = '';
      
      const isValid = component.isValidPhoneNumber();
      
      expect(isValid).toBe(true); // Empty is valid, let required validation handle it
    });
  });

  describe('Country Detection', () => {
    it('should detect country from international number', () => {
      const internationalNumber = '+442079460958';
      component.displayPhoneNumber = internationalNumber;
      
      component.onPhoneNumberChange();
      
      expect(component.selectedCountry.code).toBe('GB');
      expect(component.countryControl.value?.code).toBe('GB');
    });

    it('should detect US from +1 number', () => {
      const usInternationalNumber = '+12024561111';
      component.displayPhoneNumber = usInternationalNumber;
      
      component.onPhoneNumberChange();
      
      expect(component.selectedCountry.code).toBe('US');
      expect(component.countryControl.value?.code).toBe('US');
    });
  });

  describe('Autocomplete Functionality', () => {
    it('should filter countries by name', () => {
      const filtered = component._filterCountries('United');
      
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some(country => country.name.includes('United'))).toBe(true);
    });

    it('should filter countries by code', () => {
      const filtered = component._filterCountries('US');
      
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some(country => country.code === 'US')).toBe(true);
    });

    it('should filter countries by dial code', () => {
      const filtered = component._filterCountries('+1');
      
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some(country => country.dialCode === '+1')).toBe(true);
    });

    it('should display country with flag, name and dial code', () => {
      const usCountry = component.countries.find(c => c.code === 'US')!;
      
      const displayText = component.displayCountryFn(usCountry);
      
      expect(displayText).toContain('🇺🇸');
      expect(displayText).toContain('United States');
      expect(displayText).toContain('+1');
    });

    it('should handle country selection', () => {
      const ukCountry = component.countries.find(c => c.code === 'GB')!;
      
      component.onCountrySelected(ukCountry);
      
      expect(component.selectedCountry).toBe(ukCountry);
      expect(component.formatter).toBeDefined();
    });
  });

  describe('Example Phone Numbers', () => {
    it('should return correct example for US', () => {
      const usCountry = component.countries.find(c => c.code === 'US')!;
      component.selectedCountry = usCountry;
      
      const example = component.getExamplePhoneNumber();
      
      expect(example).toBe('(202) 456-1111');
    });

    it('should return correct example for UK', () => {
      const ukCountry = component.countries.find(c => c.code === 'GB')!;
      component.selectedCountry = ukCountry;
      
      const example = component.getExamplePhoneNumber();
      
      expect(example).toBe('020 7946 0958');
    });

    it('should return fallback example for unknown country', () => {
      component.selectedCountry = { code: 'XX', name: 'Unknown', dialCode: '+999', flag: '🏳️' };
      
      const example = component.getExamplePhoneNumber();
      
      expect(example).toBe('+999 123 4567');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed phone numbers gracefully', () => {
      component.displayPhoneNumber = 'not-a-phone-number';
      
      expect(() => component.onPhoneNumberChange()).not.toThrow();
    });

    it('should handle empty selected country', () => {
      component.selectedCountry = null as any;
      component.displayPhoneNumber = '5551234567';
      
      expect(() => component.onPhoneNumberChange()).not.toThrow();
    });

    it('should emit field change events', () => {
      spyOn(component.onFieldChange, 'emit');
      
      const usCountry = component.countries.find(c => c.code === 'US');
      component.selectedCountry = usCountry!;
      component.displayPhoneNumber = '5551234567';
      
      component.onPhoneNumberChange();
      
      expect(component.onFieldChange.emit).toHaveBeenCalledWith(component.value);
    });
  });

  describe('Widget Configuration', () => {
    it('should configure from widget params', () => {
      component.widgetStructure = {
        widget_params: {
          preferred_countries: ['CA', 'GB'],
          enable_placeholder: false,
          phone_validation: false
        }
      } as any;
      
      component.configureFromWidgetParams();
      
      expect(component.preferredCountries).toEqual(['CA', 'GB']);
      expect(component.enablePlaceholder).toBe(false);
      expect(component.phoneValidation).toBe(false);
    });

    it('should handle missing widget params', () => {
      component.widgetStructure = {} as any;
      
      expect(() => component.configureFromWidgetParams()).not.toThrow();
    });
  });
});