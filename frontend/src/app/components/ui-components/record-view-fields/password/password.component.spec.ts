import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PasswordRecordViewComponent } from './password.component';

describe('PasswordRecordViewComponent', () => {
	let component: PasswordRecordViewComponent;
	let fixture: ComponentFixture<PasswordRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PasswordRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PasswordRecordViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
