import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BannerComponent } from './banner.component';

describe('BannerComponent', () => {
	let component: BannerComponent;
	let fixture: ComponentFixture<BannerComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, BannerComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(BannerComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
