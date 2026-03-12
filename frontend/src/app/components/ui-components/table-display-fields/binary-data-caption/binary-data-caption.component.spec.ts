import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BinaryDataCaptionDisplayComponent } from './binary-data-caption.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('BinaryDataCaptionDisplayComponent', () => {
	let component: BinaryDataCaptionDisplayComponent;
	let fixture: ComponentFixture<BinaryDataCaptionDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [BinaryDataCaptionDisplayComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(BinaryDataCaptionDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display value', () => {
		fixture.componentRef.setInput('value', 'binary-data-placeholder');
		fixture.detectChanges();
		expect(component.value()).toBe('binary-data-placeholder');
	});
});
