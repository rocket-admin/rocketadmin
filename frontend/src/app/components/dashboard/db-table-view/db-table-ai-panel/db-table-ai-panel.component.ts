import { CommonModule } from '@angular/common';
import {
	AfterViewInit,
	Component,
	ElementRef,
	HostListener,
	Input,
	inject,
	OnDestroy,
	OnInit,
	ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Angulartics2, Angulartics2Module } from 'angulartics2';
import { MarkdownModule } from 'ngx-markdown';
import posthog from 'posthog-js';
import { AiService } from 'src/app/services/ai.service';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TableStateService } from 'src/app/services/table-state.service';
import { TablesService } from 'src/app/services/tables.service';

@Component({
	selector: 'app-db-table-ai-panel',
	templateUrl: './db-table-ai-panel.component.html',
	styleUrl: './db-table-ai-panel.component.css',
	imports: [
		CommonModule,
		FormsModule,
		MarkdownModule,
		MatIconModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
		Angulartics2Module,
	],
})
export class DbTableAiPanelComponent implements OnInit, AfterViewInit, OnDestroy {
	@Input() public displayName: string;
	@Input() public tableColumns: string[] = [];
	@Input() public sidebarExpanded: boolean = true;
	@ViewChild('chatContainer') private chatContainer!: ElementRef;

	public connectionID: string;
	public tableName: string;
	public isAIpanelOpened: boolean = false;
	public message: string = '';
	public charactrsNumber: number = 0;
	public threadID: string = null;
	public messagesChain: {
		type: string;
		text: string;
	}[] = [];
	public aiSuggestions: { title: string; prompt: string; completions: string[] }[] = [];
	public suggestionCategories: {
		title: string;
		suggestions: { title: string; prompt: string; completions: string[] }[];
	}[] = [];
	public activeSuggestion: { title: string; prompt: string; completions: string[] } | null = null;
	public activeCompletions: string[] = [];
	public showCompletions: boolean = false;
	public submitting: boolean = false;
	public isExpanded: boolean = false;
	public textareaRows: number = 4;
	public currentLoadingStep: string = '';

	private _aiService = inject(AiService);
	private _abortController: AbortController | null = null;
	private _loadingStepsInterval: any = null;
	private _loadingSteps: string[] = [
		'Connecting to database',
		'Analyzing table structure',
		'Scanning records',
		'Processing your query',
		'Searching for patterns',
		'Generating response',
	];
	private _currentStepIndex: number = 0;

	constructor(
		private _connections: ConnectionsService,
		private _tables: TablesService,
		private _tableState: TableStateService,
		private angulartics2: Angulartics2,
	) {}

	ngOnInit(): void {
		this.connectionID = this._connections.currentConnectionID;
		this.tableName = this._tables.currentTableName;

		this._tableState.aiPanelCast.subscribe((isAIpanelOpened) => {
			this.isAIpanelOpened = isAIpanelOpened;
		});

		this._tableState.aiPanelExpandedCast.subscribe((isExpanded) => {
			this.isExpanded = isExpanded;
		});

		this.adjustTextareaRows();
		this.generateSuggestionCategories();
	}

	ngOnChanges(): void {
		this.generateSuggestionCategories();
	}

	async ngAfterViewInit() {
		const mermaid = await import('mermaid');
		const mermaidAPI: any = mermaid.default ?? mermaid;
		const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		mermaidAPI.initialize({
			startOnLoad: false,
			theme: isDark ? 'dark' : 'default',
		});
		//@ts-expect-error dynamic load of mermaid
		window.mermaid = mermaidAPI;
	}

	ngOnDestroy() {
		this.cancelRequest();
		this.stopLoadingSteps();
		this.angulartics2.eventTrack.next({
			action: 'AI panel: destroyed',
			properties: {
				messagesLength: this.messagesChain.length,
			},
		});
		posthog.capture('AI panel: destroyed', {
			messagesLength: this.messagesChain.length,
		});
	}

	cancelRequest(): void {
		if (this._abortController) {
			this._abortController.abort();
			this._abortController = null;
			this.submitting = false;
			this.stopLoadingSteps();

			this.messagesChain.push({
				type: 'ai-error',
				text: 'Request cancelled',
			});

			this.angulartics2.eventTrack.next({
				action: 'AI panel: request cancelled',
			});
			posthog.capture('AI panel: request cancelled');
		}
	}

	startLoadingSteps(): void {
		this._currentStepIndex = 0;
		this.currentLoadingStep = this._loadingSteps[0];
		this._loadingStepsInterval = setInterval(() => {
			this._currentStepIndex = (this._currentStepIndex + 1) % this._loadingSteps.length;
			this.currentLoadingStep = this._loadingSteps[this._currentStepIndex];
		}, 2000);
	}

	stopLoadingSteps(): void {
		if (this._loadingStepsInterval) {
			clearInterval(this._loadingStepsInterval);
			this._loadingStepsInterval = null;
		}
	}

	onKeydown(event: KeyboardEvent): void {
		this.charactrsNumber = this.message.length + 1;

		if (event.key === 'Enter') {
			if (event.shiftKey) {
				event.preventDefault();
				const textarea = event.target as HTMLTextAreaElement;
				const cursorPos = textarea.selectionStart;
				this.message = this.message.substring(0, cursorPos) + '\n' + this.message.substring(cursorPos);
				setTimeout(() => {
					textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
				});
			} else {
				event.preventDefault();
				if (this.threadID) {
					this.sendMessage();
				} else {
					this.createThread();
				}
			}
		}
	}

	async createThread(suggestedMessage?: string) {
		if (suggestedMessage) {
			this.message = suggestedMessage;
		}
		this.submitting = true;
		this.startLoadingSteps();
		this.messagesChain.push({
			type: 'user',
			text: this.message,
		});
		const messageCopy = this.message;
		this.message = '';

		this._abortController = new AbortController();

		try {
			const response = await this._aiService.createThread(
				this.connectionID,
				this.tableName,
				messageCopy,
				this._abortController.signal,
			);

			if (response) {
				this.threadID = response.threadId;
				const aiMessage = { type: 'ai', text: '' };
				this.messagesChain.push(aiMessage);
				this.stopLoadingSteps();

				await this._consumeStream(response.stream, aiMessage);

				this.angulartics2.eventTrack.next({
					action: 'AI panel: thread created successfully',
				});
				posthog.capture('AI panel: thread created successfully');
			}
		} catch (error_message) {
			this.messagesChain.push({
				type: 'ai-error',
				text: String(error_message),
			});
			this.angulartics2.eventTrack.next({
				action: 'AI panel: thread creation returned an error',
			});
			posthog.capture('AI panel: thread creation returned an error');
		} finally {
			this.submitting = false;
			this.stopLoadingSteps();
			this._abortController = null;
		}
	}

	async sendMessage(suggestedMessage?: string) {
		if (suggestedMessage) {
			this.message = suggestedMessage;
		}
		this.submitting = true;
		this.startLoadingSteps();
		this.messagesChain.push({
			type: 'user',
			text: this.message,
		});
		const messageCopy = this.message;
		this.message = '';
		this.charactrsNumber = 0;

		this._abortController = new AbortController();

		try {
			const stream = await this._aiService.sendMessage(
				this.connectionID,
				this.tableName,
				this.threadID,
				messageCopy,
				this._abortController.signal,
			);

			if (stream) {
				const aiMessage = { type: 'ai', text: '' };
				this.messagesChain.push(aiMessage);
				this.stopLoadingSteps();

				await this._consumeStream(stream, aiMessage);

				this.angulartics2.eventTrack.next({
					action: 'AI panel: message sent successfully',
				});
				posthog.capture('AI panel: message sent successfully');
			}
		} catch (error_message) {
			this.messagesChain.push({
				type: 'ai-error',
				text: String(error_message),
			});
			this.angulartics2.eventTrack.next({
				action: 'AI panel: message sent and returned an error',
			});
			posthog.capture('AI panel: message sent and returned an error');
		} finally {
			this.submitting = false;
			this.stopLoadingSteps();
			this._abortController = null;
		}
	}

	private async _consumeStream(stream: AsyncGenerator<string>, message: { type: string; text: string }) {
		for await (const chunk of stream) {
			message.text += chunk;
		}
	}

	scrollToBottom(): void {
		if (this.chatContainer) this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
	}

	ngAfterViewChecked(): void {
		this.scrollToBottom();
	}

	handleClose() {
		this._tableState.handleViewAIpanel();
	}

	toggleExpand() {
		this._tableState.toggleAIPanelExpanded();
	}

	@HostListener('window:resize')
	onWindowResize() {
		this.adjustTextareaRows();
	}

	@HostListener('document:click', ['$event'])
	onDocumentClick(event: MouseEvent) {
		if (!this.showCompletions) return;

		const target = event.target as HTMLElement;
		const clickedOnChip = target.closest('.suggestion-chip');
		const clickedOnDropdown = target.closest('.ai-completions');
		const clickedOnInput = target.closest('.ai-welcome-form__field');

		if (!clickedOnChip && !clickedOnDropdown && !clickedOnInput) {
			this.showCompletions = false;
			this.activeSuggestion = null;
		}
	}

	private adjustTextareaRows() {
		const windowHeight = window.innerHeight;

		if (windowHeight < 500) {
			this.textareaRows = 1;
		} else if (windowHeight < 650) {
			this.textareaRows = 2;
		} else if (windowHeight < 800) {
			this.textareaRows = 3;
		} else if (windowHeight < 950) {
			this.textareaRows = 4;
		} else {
			this.textareaRows = 5;
		}
	}

	private generateSuggestionCategories(): void {
		const categories: { title: string; suggestions: { title: string; prompt: string; completions: string[] }[] }[] = [];

		// Category: Explore Data
		categories.push({
			title: 'Explore',
			suggestions: [
				{
					title: 'Show recent records',
					prompt: 'Show recent records',
					completions: [
						'Show recent records - the 10 most recently added',
						'Show recent records - from the last 24 hours',
						'Show recent records - the last entry added',
						'Show recent records - with newest timestamps',
					],
				},
				{
					title: 'Summarize table',
					prompt: 'Summarize table',
					completions: [
						'Summarize table - structure and content overview',
						'Summarize table - what kind of data is stored',
						'Summarize table - purpose of each column',
						'Summarize table - record count and what they represent',
					],
				},
				{
					title: 'Find patterns',
					prompt: 'Find patterns',
					completions: [
						'Find patterns - in this data',
						'Find patterns - correlations between columns',
						'Find patterns - common value combinations',
						'Find patterns - seasonal or cyclical trends',
					],
				},
			],
		});

		// Category: Data Quality
		categories.push({
			title: 'Data Quality',
			suggestions: [
				{
					title: 'Find issues',
					prompt: 'Find issues',
					completions: [
						'Find issues - data quality problems',
						'Find issues - missing or NULL values',
						'Find issues - potential duplicates',
						'Find issues - inconsistent data formats',
					],
				},
				{
					title: 'Check duplicates',
					prompt: 'Check duplicates',
					completions: [
						'Check duplicates - any duplicate records',
						'Check duplicates - rows that look similar',
						'Check duplicates - values appearing multiple times',
						'Check duplicates - records entered twice',
					],
				},
				{
					title: 'Validate data',
					prompt: 'Validate data',
					completions: [
						'Validate data - required fields filled',
						'Validate data - incorrect values',
						'Validate data - records not matching patterns',
						'Validate data - outliers and unusual values',
					],
				},
			],
		});

		// Category: Insights
		categories.push({
			title: 'Insights',
			suggestions: [
				{
					title: 'Top values',
					prompt: 'Top values',
					completions: [
						'Top values - most common in each column',
						'Top values - 10 most frequent entries',
						'Top values - categories with most records',
						'Top values - what appears most often',
					],
				},
				{
					title: 'Statistics',
					prompt: 'Statistics',
					completions: [
						'Statistics - for numeric columns',
						'Statistics - min, max, and average',
						'Statistics - distribution of values',
						'Statistics - summary of this data',
					],
				},
				{
					title: 'Anomalies',
					prompt: 'Anomalies',
					completions: [
						'Anomalies - unusual or unexpected values',
						'Anomalies - records that stand out',
						'Anomalies - statistical outliers',
						'Anomalies - what looks different or wrong',
					],
				},
			],
		});

		this.suggestionCategories = categories;
	}

	onSuggestionChipClick(suggestion: { title: string; prompt: string; completions: string[] }): void {
		this.activeSuggestion = suggestion;
		this.message = suggestion.prompt;
		this.activeCompletions = suggestion.completions;
		this.showCompletions = true;

		this.angulartics2.eventTrack.next({
			action: 'AI panel: suggestion chip clicked',
			properties: {
				suggestionTitle: suggestion.title,
			},
		});
		posthog.capture('AI panel: suggestion chip clicked', {
			suggestionTitle: suggestion.title,
		});
	}

	selectCompletion(completion: string): void {
		this.message = completion;
		this.showCompletions = false;
		this.activeSuggestion = null;
		this.createThread(completion);

		this.angulartics2.eventTrack.next({
			action: 'AI panel: completion selected',
			properties: {
				completion: completion,
			},
		});
		posthog.capture('AI panel: completion selected', {
			completion: completion,
		});
	}

	onWelcomeInputChange(): void {
		if (this.message.length > 0 && (!this.activeSuggestion || this.message !== this.activeSuggestion.prompt)) {
			this.showCompletions = false;
			this.activeSuggestion = null;
		}
	}

	onCompletionHover(completion: string): void {
		this.message = completion;
	}

	onCompletionMouseLeave(): void {
		if (this.activeSuggestion) {
			this.message = this.activeSuggestion.prompt;
		}
	}

	onWelcomeInputFocus(): void {
		if (this.activeSuggestion) {
			this.showCompletions = true;
		}
	}

	onWelcomeInputBlur(): void {
		// Dropdown closing is now handled by document click listener
	}
}
