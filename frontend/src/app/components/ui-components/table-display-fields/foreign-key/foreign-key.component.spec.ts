import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForeignKeyDisplayComponent } from './foreign-key.component';

describe('ForeignKeyDisplayComponent', () => {
	let component: ForeignKeyDisplayComponent;
	let fixture: ComponentFixture<ForeignKeyDisplayComponent>;

	const relations = {
		column_name: 'user_id',
		constraint_name: 'fk_user',
		referenced_column_name: 'id',
		referenced_table_name: 'users',
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ForeignKeyDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ForeignKeyDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display value', () => {
		fixture.componentRef.setInput('value', '42');
		expect(component.value()).toBe('42');
	});

	it('should show foreign key button when relations exist', () => {
		fixture.componentRef.setInput('value', '42');
		fixture.componentRef.setInput('relations', relations);
		fixture.detectChanges();
		const button = fixture.nativeElement.querySelector('button.foreign-key-button');
		expect(button).toBeTruthy();
	});

	it('should render a dash when value is null', () => {
		fixture.componentRef.setInput('value', null);
		fixture.componentRef.setInput('relations', relations);
		fixture.detectChanges();
		const button = fixture.nativeElement.querySelector('button.foreign-key-button');
		const span = fixture.nativeElement.querySelector('.field-value span');
		expect(button).toBeFalsy();
		expect(span?.textContent?.trim()).toBe('—');
	});

	it('should render a dash when value is undefined', () => {
		fixture.componentRef.setInput('value', undefined);
		fixture.componentRef.setInput('relations', relations);
		fixture.detectChanges();
		const span = fixture.nativeElement.querySelector('.field-value span');
		expect(span?.textContent?.trim()).toBe('—');
	});

	it('should render the FK button (not a dash) when value is 0', () => {
		fixture.componentRef.setInput('value', 0);
		fixture.componentRef.setInput('relations', relations);
		fixture.detectChanges();
		const button = fixture.nativeElement.querySelector('button.foreign-key-button');
		expect(button).toBeTruthy();
		expect(button.textContent.trim()).toBe('0');
	});

	it('should render the FK button (not a dash) when value is empty string', () => {
		fixture.componentRef.setInput('value', '');
		fixture.componentRef.setInput('relations', relations);
		fixture.detectChanges();
		const button = fixture.nativeElement.querySelector('button.foreign-key-button');
		expect(button).toBeTruthy();
	});
});
