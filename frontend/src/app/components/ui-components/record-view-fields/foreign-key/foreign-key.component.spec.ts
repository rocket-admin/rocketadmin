import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForeignKeyRecordViewComponent } from './foreign-key.component';

describe('ForeignKeyRecordViewComponent', () => {
	let component: ForeignKeyRecordViewComponent;
	let fixture: ComponentFixture<ForeignKeyRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ForeignKeyRecordViewComponent],
			providers: [provideRouter([])],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ForeignKeyRecordViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should set foreignKeyURLParams on init', () => {
		fixture.componentRef.setInput('primaryKeysParams', { id: 1 });
		component.ngOnInit();
		expect(component.foreignKeyURLParams).toEqual({ id: 1, mode: 'view' });
	});

	it('should render a dash when displayValue is null', () => {
		fixture.componentRef.setInput('link', '/foo');
		fixture.componentRef.setInput('primaryKeysParams', { id: 1 });
		fixture.componentRef.setInput('displayValue', null);
		fixture.detectChanges();

		const anchor = fixture.nativeElement.querySelector('a.foreign-key-link');
		const span = fixture.nativeElement.querySelector('span.field-view-value');
		expect(anchor).toBeFalsy();
		expect(span?.textContent?.trim()).toBe('—');
	});

	it('should render a dash when displayValue is undefined', () => {
		fixture.componentRef.setInput('link', '/foo');
		fixture.componentRef.setInput('primaryKeysParams', { id: 1 });
		fixture.componentRef.setInput('displayValue', undefined);
		fixture.detectChanges();

		const anchor = fixture.nativeElement.querySelector('a.foreign-key-link');
		const span = fixture.nativeElement.querySelector('span.field-view-value');
		expect(anchor).toBeFalsy();
		expect(span?.textContent?.trim()).toBe('—');
	});

	it('should render the link (not a dash) when displayValue is 0', () => {
		fixture.componentRef.setInput('link', '/foo');
		fixture.componentRef.setInput('primaryKeysParams', { id: 1 });
		fixture.componentRef.setInput('displayValue', 0 as unknown as string);
		fixture.detectChanges();

		const anchor = fixture.nativeElement.querySelector('a.foreign-key-link');
		expect(anchor).toBeTruthy();
		expect(anchor.querySelector('span').textContent.trim()).toBe('0');
	});

	it('should render the link (not a dash) when displayValue is empty string', () => {
		fixture.componentRef.setInput('link', '/foo');
		fixture.componentRef.setInput('primaryKeysParams', { id: 1 });
		fixture.componentRef.setInput('displayValue', '');
		fixture.detectChanges();

		const anchor = fixture.nativeElement.querySelector('a.foreign-key-link');
		expect(anchor).toBeTruthy();
	});
});
