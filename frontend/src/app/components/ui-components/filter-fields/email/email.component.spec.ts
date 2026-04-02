import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { EmailFilterComponent } from './email.component';

describe('EmailFilterComponent', () => {
	let component: EmailFilterComponent;
	let fixture: ComponentFixture<EmailFilterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [EmailFilterComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(EmailFilterComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		fixture.detectChanges();
		expect(component).toBeTruthy();
	});

	it('should default to eq filter mode', () => {
		fixture.detectChanges();
		expect(component.filterMode).toBe('eq');
	});

	it('should emit eq comparator by default after view init', () => {
		const emitted: string[] = [];
		component.onComparatorChange.subscribe((v: string) => emitted.push(v));

		component.ngOnInit();
		const emittedDuringInit = [...emitted];

		component.ngAfterViewInit();

		expect(emittedDuringInit).toEqual([]);
		expect(emitted).toEqual(['eq']);
	});

	it('should prefix domain value with @ on domain change', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.detectChanges();

		component.onDomainChange('gmail.com');

		expect(component.value).toBe('@gmail.com');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('@gmail.com');
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('endswith');
	});

	it('should switch to eq mode and emit plain text', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.detectChanges();

		component.textValue = 'user@test.com';
		component.onFilterModeChange('eq');

		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('eq');
		expect(component.onFieldChange.emit).toHaveBeenCalledWith('user@test.com');
	});

	it('should switch to empty mode', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		vi.spyOn(component.onComparatorChange, 'emit');
		fixture.detectChanges();

		component.onFilterModeChange('empty');

		expect(component.value).toBe('');
		expect(component.onComparatorChange.emit).toHaveBeenCalledWith('empty');
	});

	it('should parse existing @domain value on init', () => {
		component.value = '@example.com';
		fixture.detectChanges();

		expect(component.filterMode).toBe('domain');
		expect(component.domainValue).toBe('example.com');
	});
});
