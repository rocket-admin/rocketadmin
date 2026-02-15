import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CounterWidgetComponent } from './counter-widget.component';

describe('CounterWidgetComponent', () => {
	let component: CounterWidgetComponent;
	let fixture: ComponentFixture<CounterWidgetComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CounterWidgetComponent, BrowserAnimationsModule],
			providers: [provideHttpClient(), provideHttpClientTesting()],
		}).compileComponents();

		fixture = TestBed.createComponent(CounterWidgetComponent);
		component = fixture.componentInstance;
		component.widget = {
			id: 'test-id',
			position_x: 0,
			position_y: 0,
			width: 2,
			height: 2,
			query_id: 'test-query',
			dashboard_id: 'test-dashboard',
		};
		component.connectionId = 'test-conn';
		component.preloadedQuery = {
			id: 'test-query',
			name: 'Test Counter',
			description: null,
			widget_type: 'counter',
			chart_type: null,
			widget_options: { value_column: 'total' },
			query_text: 'SELECT COUNT(*) as total FROM users',
			connection_id: 'test-conn',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		component.preloadedData = [{ total: 42 }];
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display counter value from preloaded data', () => {
		const compiled = fixture.nativeElement;
		expect(compiled.querySelector('.counter-container')).toBeTruthy();
		expect(compiled.querySelector('.counter-value').textContent).toContain('42');
	});
});
