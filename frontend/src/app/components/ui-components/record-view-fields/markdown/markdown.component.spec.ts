import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideMarkdown } from 'ngx-markdown';
import { MarkdownRecordViewComponent } from './markdown.component';

describe('MarkdownRecordViewComponent', () => {
	let component: MarkdownRecordViewComponent;
	let fixture: ComponentFixture<MarkdownRecordViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MarkdownRecordViewComponent, BrowserAnimationsModule],
			providers: [provideHttpClient(), provideMarkdown()],
		}).compileComponents();

		fixture = TestBed.createComponent(MarkdownRecordViewComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('value', '# Test Markdown');
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
