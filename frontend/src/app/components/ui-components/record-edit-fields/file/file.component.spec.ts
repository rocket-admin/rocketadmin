import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FileEditComponent } from './file.component';

describe('FileEditComponent', () => {
	let component: FileEditComponent;
	let fixture: ComponentFixture<FileEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FormsModule, MatRadioModule, FileEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(FileEditComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should default fileType to hex', () => {
		expect(component.fileType).toBe('hex');
	});

	it('should set hexData from value on init when no widgetStructure', () => {
		component.value = '48656c6c6f' as any;
		component.ngOnInit();
		expect(component.hexData).toBe('48656c6c6f');
	});

	it('should set fileType from widgetStructure on init', () => {
		component.value = '48656c6c6f' as any;
		component.widgetStructure = { widget_params: { type: 'base64' } } as any;
		component.ngOnInit();
		expect(component.fileType).toBe('base64');
	});

	it('should convert hex to base64', () => {
		component.hexData = '48656c6c6f';
		component.fromHexToBase64();
		expect(component.base64Data).toBe('SGVsbG8=');
	});

	it('should convert base64 to hex', () => {
		component.base64Data = 'SGVsbG8=';
		component.fromBase64ToHex();
		expect(component.hexData).toBe('48656c6c6f');
	});

	it('should set isNotSwitcherActive to true on invalid base64', () => {
		component.base64Data = '!!!invalid!!!';
		component.fromBase64ToHex();
		expect(component.isNotSwitcherActive).toBe(true);
	});

	it('should emit onFieldChange on hex change', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.hexData = '48656c6c6f';
		component.onHexChange();
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('48656c6c6f');
	});

	it('should convert base64 to hex and emit on base64 change', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.base64Data = 'SGVsbG8=';
		component.onBase64Change();
		expect(component.hexData).toBe('48656c6c6f');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('48656c6c6f');
	});

	it('should call convertValue for base64 when hexData exists', () => {
		component.hexData = '48656c6c6f';
		component.convertValue('base64' as any);
		expect(component.base64Data).toBe('SGVsbG8=');
	});
});
