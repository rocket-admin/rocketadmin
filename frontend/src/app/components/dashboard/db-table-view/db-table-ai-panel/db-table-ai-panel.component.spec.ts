import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { AiService } from 'src/app/services/ai.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TableStateService } from 'src/app/services/table-state.service';
import { TablesService } from 'src/app/services/tables.service';
import { DbTableAiPanelComponent } from './db-table-ai-panel.component';

async function* mockStream(...chunks: string[]): AsyncGenerator<string> {
	for (const chunk of chunks) {
		yield chunk;
	}
}

describe('DbTableAiPanelComponent', () => {
	let component: DbTableAiPanelComponent;
	let fixture: ComponentFixture<DbTableAiPanelComponent>;
	let tableStateService: TableStateService;

	const mockConnectionsService = {
		currentConnectionID: '12345678',
	};

	const mockTablesService = {
		currentTableName: 'users',
	};

	const mockAiService: Partial<AiService> = {
		createThread: vi.fn(),
		sendMessage: vi.fn(),
	};

	const mockTableStateService = {
		aiPanelCast: of(false),
		aiPanelExpandedCast: of(false),
		handleViewAIpanel: vi.fn(),
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Angulartics2Module.forRoot(), DbTableAiPanelComponent, BrowserAnimationsModule, MatIconTestingModule],
			providers: [
				provideHttpClient(),
				{ provide: ConnectionsService, useValue: mockConnectionsService },
				{ provide: TablesService, useValue: mockTablesService },
				{ provide: AiService, useValue: mockAiService },
				{ provide: TableStateService, useValue: mockTableStateService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DbTableAiPanelComponent);
		component = fixture.componentInstance;
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

	it('should have default suggestion categories', () => {
		expect(component.suggestionCategories.length).toBeGreaterThan(0);
		expect(component.suggestionCategories[0].title).toBe('Explore');
	});

	it('should update character count on keydown', () => {
		component.message = 'Hello';
		const event = new KeyboardEvent('keydown', { key: 'a' });
		component.onKeydown(event);
		expect(component.charactrsNumber).toBe(6);
	});

	it('should create thread on Enter key when no thread exists', () => {
		(mockAiService.createThread as ReturnType<typeof vi.fn>).mockResolvedValue({
			threadId: 'thread-123',
			stream: mockStream('AI response'),
		});

		component.message = 'Test message';
		component.threadID = null;

		const event = new KeyboardEvent('keydown', { key: 'Enter' });
		Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
		component.onKeydown(event);

		expect(mockAiService.createThread).toHaveBeenCalledWith(
			'12345678',
			'users',
			'Test message',
			expect.any(AbortSignal),
		);
	});

	it('should send message on Enter key when thread exists', () => {
		(mockAiService.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue(mockStream('AI response'));

		component.message = 'Follow up message';
		component.threadID = 'existing-thread';

		const event = new KeyboardEvent('keydown', { key: 'Enter' });
		Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
		component.onKeydown(event);

		expect(mockAiService.sendMessage).toHaveBeenCalledWith(
			'12345678',
			'users',
			'existing-thread',
			'Follow up message',
			expect.any(AbortSignal),
		);
	});

	it('should add user message to chain when creating thread', async () => {
		(mockAiService.createThread as ReturnType<typeof vi.fn>).mockResolvedValue({
			threadId: 'thread-123',
			stream: mockStream('AI response'),
		});

		component.message = 'User question';
		await component.createThread();

		expect(component.messagesChain[0]).toEqual({
			type: 'user',
			text: 'User question',
		});
	});

	it('should add AI response to chain after thread creation', async () => {
		(mockAiService.createThread as ReturnType<typeof vi.fn>).mockResolvedValue({
			threadId: 'thread-123',
			stream: mockStream('AI response'),
		});

		component.message = 'User question';
		await component.createThread();

		expect(component.threadID).toBe('thread-123');
		expect(component.messagesChain[1]).toEqual({
			type: 'ai',
			text: 'AI response',
		});
	});

	it('should handle error when creating thread', async () => {
		(mockAiService.createThread as ReturnType<typeof vi.fn>).mockRejectedValue('Error message');

		component.message = 'User question';
		await component.createThread();

		expect(component.messagesChain[1]).toEqual({
			type: 'ai-error',
			text: 'Error message',
		});
	});

	it('should use suggested message when provided to createThread', async () => {
		(mockAiService.createThread as ReturnType<typeof vi.fn>).mockResolvedValue({
			threadId: 'thread-123',
			stream: mockStream('AI response'),
		});

		await component.createThread('Suggested question');

		expect(component.messagesChain[0].text).toBe('Suggested question');
	});

	it('should call handleViewAIpanel when closing', () => {
		component.handleClose();
		expect(mockTableStateService.handleViewAIpanel).toHaveBeenCalled();
	});

	it('should clear message after sending', async () => {
		(mockAiService.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue(mockStream('AI response'));

		component.message = 'Test message';
		component.threadID = 'thread-123';
		await component.sendMessage();

		expect(component.message).toBe('');
		expect(component.charactrsNumber).toBe(0);
	});
});
