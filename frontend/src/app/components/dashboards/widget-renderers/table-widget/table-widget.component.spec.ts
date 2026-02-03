import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TableWidgetComponent } from './table-widget.component';

describe('TableWidgetComponent', () => {
	let component: TableWidgetComponent;
	let fixture: ComponentFixture<TableWidgetComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TableWidgetComponent, BrowserAnimationsModule],
			providers: [provideHttpClient(), provideHttpClientTesting()],
		}).compileComponents();

		fixture = TestBed.createComponent(TableWidgetComponent);
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
			name: 'Test Table',
			description: null,
			widget_type: 'table',
			chart_type: null,
			widget_options: null,
			query_text: 'SELECT * FROM users',
			connection_id: 'test-conn',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		component.preloadedData = [
			{ id: 1, name: 'John', email: 'john@example.com' },
			{ id: 2, name: 'Jane', email: 'jane@example.com' },
		];
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display table with preloaded data', () => {
		const compiled = fixture.nativeElement;
		expect(compiled.querySelector('.table-container')).toBeTruthy();
		expect(compiled.querySelector('table')).toBeTruthy();
	});

	it('should compute columns from data', () => {
		const columns = component['columns']();
		expect(columns).toEqual(['id', 'name', 'email']);
	});
});
