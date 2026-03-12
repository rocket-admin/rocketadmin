import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForeignKeyDisplayComponent } from './foreign-key.component';

describe('ForeignKeyDisplayComponent', () => {
	let component: ForeignKeyDisplayComponent;
	let fixture: ComponentFixture<ForeignKeyDisplayComponent>;

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
		fixture.componentRef.setInput('relations', {
			column_name: 'user_id',
			constraint_name: 'fk_user',
			referenced_column_name: 'id',
			referenced_table_name: 'users',
		});
		fixture.detectChanges();
		const compiled = fixture.nativeElement;
		const button = compiled.querySelector('button');
		expect(button).toBeTruthy();
	});
});
