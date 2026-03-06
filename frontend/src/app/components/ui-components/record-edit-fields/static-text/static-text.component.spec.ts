import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { StaticTextEditComponent } from './static-text.component';

describe('StaticTextEditComponent', () => {
	let component: StaticTextEditComponent;
	let fixture: ComponentFixture<StaticTextEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [StaticTextEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(StaticTextEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
