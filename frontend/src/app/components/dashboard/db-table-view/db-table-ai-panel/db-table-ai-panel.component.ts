import { Angulartics2, Angulartics2Module } from 'angulartics2';
import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { ConnectionsService } from 'src/app/services/connections.service';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { MarkdownService } from 'ngx-markdown';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
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
    Angulartics2Module
  ]
})
export class DbTableAiPanelComponent implements OnInit, OnDestroy {

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
    text: string
  }[] = [];
  public aiSuggestions: { title: string; prompt: string; completions: string[] }[] = [];
  public suggestionCategories: { title: string; suggestions: { title: string; prompt: string; completions: string[] }[] }[] = [];
  public activeSuggestion: { title: string; prompt: string; completions: string[] } | null = null;
  public activeCompletions: string[] = [];
  public showCompletions: boolean = false;
  public submitting: boolean = false;
  public isExpanded: boolean = false;
  public textareaRows: number = 4;
  public currentLoadingStep: string = '';

  private _currentRequest: Subscription = null;
  private _loadingStepsInterval: any = null;
  private _loadingSteps: string[] = [
    'Connecting to database',
    'Analyzing table structure',
    'Scanning records',
    'Processing your query',
    'Searching for patterns',
    'Generating response'
  ];
  private _currentStepIndex: number = 0;

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _tableState: TableStateService,
    private markdownService: MarkdownService,
    private angulartics2: Angulartics2,
  ) { }

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
    const mermaid = await import("mermaid")
    //@ts-expect-error dynamic load of mermaid
    window.mermaid = mermaid.default ?? mermaid;
  };

  ngOnDestroy() {
    this.cancelRequest();
    this.stopLoadingSteps();
    this.angulartics2.eventTrack.next({
      action: 'AI panel: destroyed',
      properties: {
        messagesLength: this.messagesChain.length
      }
    });
  }

  cancelRequest(): void {
    if (this._currentRequest) {
      this._currentRequest.unsubscribe();
      this._currentRequest = null;
      this.submitting = false;
      this.stopLoadingSteps();

      this.messagesChain.push({
        type: 'ai-error',
        text: 'Request cancelled'
      });

      this.angulartics2.eventTrack.next({
        action: 'AI panel: request cancelled',
      });
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
        this.message =
          this.message.substring(0, cursorPos) + '\n' + this.message.substring(cursorPos);
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

  createThread(suggestedMessage?: string) {
    if (suggestedMessage) {
      this.message = suggestedMessage;
    }
    this.submitting = true;
    this.startLoadingSteps();
    this.messagesChain.push({
      type: 'user',
      text: this.message
    });
    const messageCopy = this.message;
    this.message = '';

    this._currentRequest = this._tables.createAIthread(this.connectionID, this.tableName, messageCopy).subscribe((response) => {
      this.threadID = response.threadId;

      this.messagesChain.push({
        type: 'ai',
        text: this.markdownService.parse(response.responseMessage) as string
      });
      this.submitting = false;
      this.stopLoadingSteps();
      this._currentRequest = null;

      this.angulartics2.eventTrack.next({
        action: 'AI panel: thread created successfully',
      });
    },
      (error_message) => {
        this.messagesChain.push({
          type: 'ai-error',
          text: error_message
        });
        this.angulartics2.eventTrack.next({
          action: 'AI panel: thread creation returned an error',
        });
        this.stopLoadingSteps();
        this._currentRequest = null;
      },
      () => {
        this.submitting = false;
        this.stopLoadingSteps();
        this._currentRequest = null;
      }
    );
  }

  sendMessage(suggestedMessage?: string): void {
    if (suggestedMessage) {
      this.message = suggestedMessage;
    }
    this.submitting = true;
    this.startLoadingSteps();
    this.messagesChain.push({
      type: 'user',
      text: this.message
    });
    const messageCopy = this.message;
    this.message = '';
    this.charactrsNumber = 0;
    this._currentRequest = this._tables.requestAImessage(this.connectionID, this.tableName, this.threadID, messageCopy).subscribe((response_message) => {
      this.messagesChain.push({
        type: 'ai',
        text: this.markdownService.parse(response_message) as string
      });
      this.submitting = false;
      this.stopLoadingSteps();
      this._currentRequest = null;

      this.angulartics2.eventTrack.next({
        action: 'AI panel: message sent successfully',
      });
    },
      (error_message) => {
        this.messagesChain.push({
          type: 'ai-error',
          text: error_message
        });
        this.submitting = false;
        this.stopLoadingSteps();
        this._currentRequest = null;
        this.angulartics2.eventTrack.next({
          action: 'AI panel: message sent and returned an error',
        });
      },
      () => {
        this.submitting = false;
        this.stopLoadingSteps();
        this._currentRequest = null;
      })
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
            'Show me the 10 most recently added records',
            'Show records from the last 24 hours',
            'What was the last entry added to this table?',
            'Show records with the newest timestamps'
          ]
        },
        {
          title: 'Summarize table',
          prompt: 'Summarize table',
          completions: [
            'Give me an overview of this table structure and content',
            'What kind of data is stored in this table?',
            'Describe the purpose of each column',
            'How many records are there and what do they represent?'
          ]
        },
        {
          title: 'Find patterns',
          prompt: 'Find patterns',
          completions: [
            'What patterns do you see in this data?',
            'Are there any correlations between columns?',
            'What are the most common combinations of values?',
            'Identify any seasonal or cyclical patterns'
          ]
        }
      ]
    });

    // Category: Data Quality
    categories.push({
      title: 'Data Quality',
      suggestions: [
        {
          title: 'Find issues',
          prompt: 'Find issues',
          completions: [
            'Are there any data quality issues I should know about?',
            'Find records with missing or NULL values',
            'Identify potential duplicates',
            'Check for inconsistent data formats'
          ]
        },
        {
          title: 'Check duplicates',
          prompt: 'Check duplicates',
          completions: [
            'Are there any duplicate records?',
            'Find rows that look like duplicates',
            'Which values appear more than once where they shouldn\'t?',
            'Identify records that might be entered twice'
          ]
        },
        {
          title: 'Validate data',
          prompt: 'Validate data',
          completions: [
            'Check if all required fields are filled',
            'Are there any values that look incorrect?',
            'Find records that don\'t match expected patterns',
            'Identify outliers or unusual values'
          ]
        }
      ]
    });

    // Category: Insights
    categories.push({
      title: 'Insights',
      suggestions: [
        {
          title: 'Top values',
          prompt: 'Top values',
          completions: [
            'What are the most common values in each column?',
            'Show me the top 10 most frequent entries',
            'Which categories have the most records?',
            'What values appear most often?'
          ]
        },
        {
          title: 'Statistics',
          prompt: 'Statistics',
          completions: [
            'Calculate basic statistics for numeric columns',
            'What are the min, max, and average values?',
            'Show the distribution of values',
            'Give me a statistical summary of this data'
          ]
        },
        {
          title: 'Anomalies',
          prompt: 'Anomalies',
          completions: [
            'Are there any unusual or unexpected values?',
            'Find records that stand out from the rest',
            'Identify statistical outliers',
            'What looks different or wrong in this data?'
          ]
        }
      ]
    });

    this.suggestionCategories = categories;
  }

  onSuggestionChipClick(suggestion: { title: string; prompt: string; completions: string[] }): void {
    this.activeSuggestion = suggestion;
    this.message = '';
    this.activeCompletions = suggestion.completions;
    this.showCompletions = true;

    this.angulartics2.eventTrack.next({
      action: 'AI panel: suggestion chip clicked',
      properties: {
        suggestionTitle: suggestion.title
      }
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
        completion: completion
      }
    });
  }

  onWelcomeInputChange(): void {
    if (this.message.length > 0) {
      this.showCompletions = false;
      this.activeSuggestion = null;
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
