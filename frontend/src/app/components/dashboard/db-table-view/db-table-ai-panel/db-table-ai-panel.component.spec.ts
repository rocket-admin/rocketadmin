import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { MarkdownService } from 'ngx-markdown';
import { DbTableAiPanelComponent } from './db-table-ai-panel.component';

describe('DbTableAiPanelComponent', () => {
	let component: DbTableAiPanelComponent;
	let fixture: ComponentFixture<DbTableAiPanelComponent>;

	const mockMarkdownService = {
		parse: vi.fn().mockReturnValue('parsed markdown'),
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Angulartics2Module.forRoot(), DbTableAiPanelComponent, BrowserAnimationsModule, MatIconTestingModule],
			providers: [provideHttpClient(), { provide: MarkdownService, useValue: mockMarkdownService }],
		}).compileComponents();

		fixture = TestBed.createComponent(DbTableAiPanelComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
