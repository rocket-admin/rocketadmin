import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { ChartWidgetComponent } from './chart-widget.component';

describe('ChartWidgetComponent', () => {
	let component: ChartWidgetComponent;
	let fixture: ComponentFixture<ChartWidgetComponent>;
	let mockSavedQueriesService: Partial<SavedQueriesService>;

	beforeEach(async () => {
		mockSavedQueriesService = {
			executeSavedQuery: vi.fn(),
		} as Partial<SavedQueriesService>;

		await TestBed.configureTestingModule({
			imports: [ChartWidgetComponent, BrowserAnimationsModule],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: SavedQueriesService, useValue: mockSavedQueriesService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ChartWidgetComponent);
		component = fixture.componentInstance;
		component.widget = {
			id: 'test-id',
			name: 'Test Chart',
			widget_type: 'chart',
			chart_type: 'bar',
			description: null,
			position_x: 0,
			position_y: 0,
			width: 4,
			height: 4,
			widget_options: {},
			query_id: null,
			dashboard_id: 'test-dashboard',
		};
		component.connectionId = 'test-conn';
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
