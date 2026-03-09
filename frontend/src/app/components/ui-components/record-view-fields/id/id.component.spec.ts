import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdRecordViewComponent } from './id.component';

describe('IdRecordViewComponent', () => {
	let component: IdRecordViewComponent;
	let fixture: ComponentFixture<IdRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [IdRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(IdRecordViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
