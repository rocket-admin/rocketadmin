import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MarkdownModule } from 'ngx-markdown';
import { TextWidgetComponent } from './text-widget.component';

describe('TextWidgetComponent', () => {
	let component: TextWidgetComponent;
	let fixture: ComponentFixture<TextWidgetComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [TextWidgetComponent, BrowserAnimationsModule, MarkdownModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(TextWidgetComponent);
		component = fixture.componentInstance;
		component.widget = {
			id: 'test-id',
			name: 'Test Text',
			widget_type: 'text',
			description: null,
			position_x: 0,
			position_y: 0,
			width: 4,
			height: 4,
			widget_options: { text_content: '# Hello World' },
			query_id: null,
			dashboard_id: 'test-dashboard',
		};
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
