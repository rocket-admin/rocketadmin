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
		fixture.componentRef.setInput('value', { type: 'Buffer', data: [1, 2] });
		expect(component.isBlob).toBe(true);
	});

	it('should return Binary Data for blobs', () => {
		fixture.componentRef.setInput('value', { type: 'Buffer', data: [1, 2] });
		expect(component.displayText).toBe('Binary Data');
	});

	it('should return Binary Data for long strings', () => {
		fixture.componentRef.setInput('value', 'a]bcdefghijklmnopqrstu');
		expect(component.displayText).toBe('Binary Data');
	});

	it('should return the value for short strings', () => {
		fixture.componentRef.setInput('value', 'short.txt');
		expect(component.displayText).toBe('short.txt');
	});

	it('should return dash for null value', () => {
		fixture.componentRef.setInput('value', null);
		expect(component.displayText).toBe('—');
	});
});
