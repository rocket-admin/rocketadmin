import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SelectFilterComponent } from './select.component';

describe('SelectFilterComponent', () => {
	let component: SelectFilterComponent;
	let fixture: ComponentFixture<SelectFilterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SelectFilterComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(SelectFilterComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
