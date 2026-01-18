import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { MarkdownService } from 'ngx-markdown';
import { of, throwError } from 'rxjs';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TableStateService } from 'src/app/services/table-state.service';
import { TablesService } from 'src/app/services/tables.service';
import { DbTableAiPanelComponent } from './db-table-ai-panel.component';

describe('DbTableAiPanelComponent', () => {
	let component: DbTableAiPanelComponent;
	let fixture: ComponentFixture<DbTableAiPanelComponent>;
	let tablesService: TablesService;
	let tableStateService: TableStateService;

	const mockMarkdownService = {
		parse: vi.fn().mockReturnValue('parsed markdown'),
	};

	const mockConnectionsService = {
		currentConnectionID: '12345678',
	};

	const mockTablesService = {
		currentTableName: 'users',
		createAIthread: vi.fn(),
		requestAImessage: vi.fn(),
	};

	const mockTableStateService = {
		aiPanelCast: of(false),
		handleViewAIpanel: vi.fn(),
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Angulartics2Module.forRoot(), DbTableAiPanelComponent, BrowserAnimationsModule, MatIconTestingModule],
			providers: [
				provideHttpClient(),
				{ provide: MarkdownService, useValue: mockMarkdownService },
				{ provide: ConnectionsService, useValue: mockConnectionsService },
				{ provide: TablesService, useValue: mockTablesService },
				{ provide: TableStateService, useValue: mockTableStateService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DbTableAiPanelComponent);
		component = fixture.componentInstance;
		tablesService = TestBed.inject(TablesService);
		tableStateService = TestBed.inject(TableStateService);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize with connection ID and table name', () => {
		expect(component.connectionID).toBe('12345678');
		expect(component.tableName).toBe('users');
	});

	it('should have default AI request suggestions', () => {
		expect(component.aiRequestSuggestions.length).toBeGreaterThan(0);
		expect(component.aiRequestSuggestions).toContain('How many records were created last month?');
	});

	it('should update character count on keydown', () => {
		component.message = 'Hello';
		const event = new KeyboardEvent('keydown', { key: 'a' });
		component.onKeydown(event);
		expect(component.charactrsNumber).toBe(6);
	});

	it('should create thread on Enter key when no thread exists', () => {
		mockTablesService.createAIthread.mockReturnValue(of({ threadId: 'thread-123', responseMessage: 'AI response' }));

		component.message = 'Test message';
		component.threadID = null;

		const event = new KeyboardEvent('keydown', { key: 'Enter' });
		Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
		component.onKeydown(event);

		expect(mockTablesService.createAIthread).toHaveBeenCalledWith('12345678', 'users', 'Test message');
	});

	it('should send message on Enter key when thread exists', () => {
		mockTablesService.requestAImessage.mockReturnValue(of('AI response'));

		component.message = 'Follow up message';
		component.threadID = 'existing-thread';

		const event = new KeyboardEvent('keydown', { key: 'Enter' });
		Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
		component.onKeydown(event);

		expect(mockTablesService.requestAImessage).toHaveBeenCalledWith(
			'12345678',
			'users',
			'existing-thread',
			'Follow up message',
		);
	});

	it('should add user message to chain when creating thread', () => {
		mockTablesService.createAIthread.mockReturnValue(of({ threadId: 'thread-123', responseMessage: 'AI response' }));

		component.message = 'User question';
		component.createThread();

		expect(component.messagesChain[0]).toEqual({
			type: 'user',
			text: 'User question',
		});
	});

	it('should add AI response to chain after thread creation', () => {
		mockTablesService.createAIthread.mockReturnValue(of({ threadId: 'thread-123', responseMessage: 'AI response' }));

		component.message = 'User question';
		component.createThread();

		expect(component.threadID).toBe('thread-123');
		expect(component.messagesChain[1]).toEqual({
			type: 'ai',
			text: 'parsed markdown',
		});
	});

	it('should handle error when creating thread', () => {
		mockTablesService.createAIthread.mockReturnValue(throwError(() => 'Error message'));

		component.message = 'User question';
		component.createThread();

		expect(component.messagesChain[1]).toEqual({
			type: 'ai-error',
			text: 'Error message',
		});
	});

	it('should use suggested message when provided to createThread', () => {
		mockTablesService.createAIthread.mockReturnValue(of({ threadId: 'thread-123', responseMessage: 'AI response' }));

		component.createThread('Suggested question');

		expect(component.messagesChain[0].text).toBe('Suggested question');
	});

	it('should call handleViewAIpanel when closing', () => {
		component.handleClose();
		expect(mockTableStateService.handleViewAIpanel).toHaveBeenCalled();
	});

	it('should clear message after sending', () => {
		mockTablesService.requestAImessage.mockReturnValue(of('AI response'));

		component.message = 'Test message';
		component.threadID = 'thread-123';
		component.sendMessage();

		expect(component.message).toBe('');
		expect(component.charactrsNumber).toBe(0);
	});
});
