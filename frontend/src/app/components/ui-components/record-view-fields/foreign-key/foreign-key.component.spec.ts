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
		component.primaryKeysParams = { id: 1 };
		component.ngOnInit();
		expect(component.foreignKeyURLParams).toEqual({ id: 1, mode: 'view' });
	});
});
