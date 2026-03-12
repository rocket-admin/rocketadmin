import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UuidRecordViewComponent } from './uuid.component';

describe('UuidRecordViewComponent', () => {
	let component: UuidRecordViewComponent;
	let fixture: ComponentFixture<UuidRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [UuidRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(UuidRecordViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
