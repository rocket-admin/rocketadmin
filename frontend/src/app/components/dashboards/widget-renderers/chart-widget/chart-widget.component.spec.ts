import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ChartWidgetComponent } from './chart-widget.component';

describe('ChartWidgetComponent', () => {
	let component: ChartWidgetComponent;
	let fixture: ComponentFixture<ChartWidgetComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ChartWidgetComponent, BrowserAnimationsModule],
			providers: [provideHttpClient(), provideHttpClientTesting()],
		}).compileComponents();

		fixture = TestBed.createComponent(ChartWidgetComponent);
		component = fixture.componentInstance;
		component.widget = {
			id: 'test-id',
			position_x: 0,
			position_y: 0,
			width: 4,
			height: 4,
			query_id: 'test-query',
			dashboard_id: 'test-dashboard',
		};
		component.connectionId = 'test-conn';
		component.preloadedQuery = {
			id: 'test-query',
			name: 'Test Query',
			description: null,
			widget_type: 'chart',
			chart_type: 'bar',
			widget_options: { label_column: 'name', value_column: 'count' },
			query_text: 'SELECT * FROM stats',
			connection_id: 'test-conn',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		component.preloadedData = [
			{ name: 'A', count: 10 },
			{ name: 'B', count: 20 },
		];
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display chart when data is provided', () => {
		const compiled = fixture.nativeElement;
		expect(compiled.querySelector('.chart-container')).toBeTruthy();
	});

	it('should compute chart data from preloaded data', () => {
		const chartData = component['chartData']();
		expect(chartData).toBeTruthy();
		expect(chartData?.labels).toEqual(['A', 'B']);
		expect(chartData?.datasets[0].data).toEqual([10, 20]);
	});
});
