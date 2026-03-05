import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ZapierComponent } from './zapier.component';

describe('ZapierComponent', () => {
	let component: ZapierComponent;
	let fixture: ComponentFixture<ZapierComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ZapierComponent, RouterModule.forRoot([])],
			providers: [provideHttpClient()],
		}).compileComponents();

		fixture = TestBed.createComponent(ZapierComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
