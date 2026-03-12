import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaticTextRecordViewComponent } from './static-text.component';

describe('StaticTextRecordViewComponent', () => {
	let component: StaticTextRecordViewComponent;
	let fixture: ComponentFixture<StaticTextRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [StaticTextRecordViewComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(StaticTextRecordViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
