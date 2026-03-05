import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TextFilterComponent } from './text.component';

describe('TextFilterComponent', () => {
	let component: TextFilterComponent;
	let fixture: ComponentFixture<TextFilterComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TextFilterComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(TextFilterComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
