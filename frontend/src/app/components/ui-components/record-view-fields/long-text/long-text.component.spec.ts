import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LongTextRecordViewComponent } from './long-text.component';

describe('LongTextRecordViewComponent', () => {
	let component: LongTextRecordViewComponent;
	let fixture: ComponentFixture<LongTextRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LongTextRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(LongTextRecordViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
