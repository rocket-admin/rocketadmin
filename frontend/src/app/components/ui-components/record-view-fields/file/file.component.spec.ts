import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileRecordViewComponent } from './file.component';

describe('FileRecordViewComponent', () => {
	let component: FileRecordViewComponent;
	let fixture: ComponentFixture<FileRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FileRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(FileRecordViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should identify blob objects', () => {
		component.value = { type: 'Buffer', data: [1, 2] };
		expect(component.isBlob).toBe(true);
	});

	it('should return Binary Data for blobs', () => {
		component.value = { type: 'Buffer', data: [1, 2] };
		expect(component.displayText).toBe('Binary Data');
	});

	it('should return Binary Data for long strings', () => {
		component.value = 'a]bcdefghijklmnopqrstu';
		expect(component.displayText).toBe('Binary Data');
	});

	it('should return the value for short strings', () => {
		component.value = 'short.txt';
		expect(component.displayText).toBe('short.txt');
	});

	it('should return dash for null value', () => {
		component.value = null;
		expect(component.displayText).toBe('—');
	});
});
