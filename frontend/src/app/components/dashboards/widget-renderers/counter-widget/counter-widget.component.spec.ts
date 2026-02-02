import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { CounterWidgetComponent } from './counter-widget.component';

describe('CounterWidgetComponent', () => {
	let component: CounterWidgetComponent;
	let fixture: ComponentFixture<CounterWidgetComponent>;
	let mockSavedQueriesService: Partial<SavedQueriesService>;

	beforeEach(async () => {
		mockSavedQueriesService = {
			executeSavedQuery: vi.fn(),
		} as Partial<SavedQueriesService>;

		await TestBed.configureTestingModule({
			imports: [CounterWidgetComponent, BrowserAnimationsModule],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: SavedQueriesService, useValue: mockSavedQueriesService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(CounterWidgetComponent);
		component = fixture.componentInstance;
		component.widget = {
			id: 'test-id',
			name: 'Test Counter',
			widget_type: 'counter',
			description: null,
			position_x: 0,
			position_y: 0,
			width: 2,
			height: 2,
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
