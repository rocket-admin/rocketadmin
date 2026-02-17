import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MarkdownModule } from 'ngx-markdown';
import { TextPanelComponent } from './text-panel.component';

describe('TextPanelComponent', () => {
	let component: TextPanelComponent;
	let fixture: ComponentFixture<TextPanelComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TextPanelComponent, BrowserAnimationsModule, MarkdownModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(TextPanelComponent);
		component = fixture.componentInstance;
		component.widget = {
			id: 'test-id',
			position_x: 0,
			position_y: 0,
			width: 4,
			height: 4,
			query_id: null,
			dashboard_id: 'test-dashboard',
		};
		component.preloadedQuery = {
			id: 'test-query',
			name: 'Test Text',
			description: null,
			widget_type: 'text',
			chart_type: null,
			widget_options: { text_content: '# Hello World' },
			query_text: '',
			connection_id: 'test-conn',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should compute text content from preloaded query', () => {
		const textContent = component['textContent']();
		expect(textContent).toBe('# Hello World');
	});
});
