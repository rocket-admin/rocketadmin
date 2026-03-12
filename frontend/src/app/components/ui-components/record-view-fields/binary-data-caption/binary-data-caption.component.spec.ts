import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BinaryDataCaptionRecordViewComponent } from './binary-data-caption.component';

describe('BinaryDataCaptionRecordViewComponent', () => {
	let component: BinaryDataCaptionRecordViewComponent;
	let fixture: ComponentFixture<BinaryDataCaptionRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [BinaryDataCaptionRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(BinaryDataCaptionRecordViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
