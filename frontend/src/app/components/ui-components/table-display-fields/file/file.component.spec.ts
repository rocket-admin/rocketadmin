import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileDisplayComponent } from './file.component';

describe('FileDisplayComponent', () => {
	let component: FileDisplayComponent;
	let fixture: ComponentFixture<FileDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FileDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(FileDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should detect blob data', () => {
		fixture.componentRef.setInput('value', { type: 'Buffer', data: [1, 2, 3] });
		fixture.detectChanges();

		expect(component.isBlob).toBe(true);
		expect(component.displayText).toBe('Binary Data');
	});

	it('should display short text value', () => {
		fixture.componentRef.setInput('value', 'short.txt');
		fixture.detectChanges();

		expect(component.isBlob).toBe(false);
		expect(component.displayText).toBe('short.txt');
	});

	it('should display Binary Data for long strings', () => {
		fixture.componentRef.setInput('value', 'a'.repeat(25));
		fixture.detectChanges();

		expect(component.displayText).toBe('Binary Data');
	});
});
