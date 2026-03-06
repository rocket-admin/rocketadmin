import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageLoaderComponent } from './page-loader.component';

describe('LoaderComponent', () => {
	let component: PageLoaderComponent;
	let fixture: ComponentFixture<PageLoaderComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [PageLoaderComponent],
			providers: [provideRouter([])],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PageLoaderComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
