import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { TableWidgetComponent } from './table-widget.component';

describe('TableWidgetComponent', () => {
	let component: TableWidgetComponent;
	let fixture: ComponentFixture<TableWidgetComponent>;
	let mockSavedQueriesService: Partial<SavedQueriesService>;

	beforeEach(async () => {
		mockSavedQueriesService = {
			executeSavedQuery: vi.fn(),
		} as Partial<SavedQueriesService>;

		await TestBed.configureTestingModule({
			imports: [TableWidgetComponent, BrowserAnimationsModule],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: SavedQueriesService, useValue: mockSavedQueriesService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(TableWidgetComponent);
		component = fixture.componentInstance;
		component.widget = {
			id: 'test-id',
			name: 'Test Table',
			widget_type: 'table',
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
