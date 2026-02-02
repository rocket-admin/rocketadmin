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
  public aiRequestTemplates: { title: string; description: string; icon: string; prompt: string }[] = [
    {
      title: 'Summarize this table',
      description: 'Quick overview of columns, types, and size',
      icon: 'bar_chart',
      prompt: 'Summarize this table structure and data'
    },
    {
      title: 'Top values',
      description: 'See most frequent values per column',
      icon: 'trending_up',
      prompt: 'Show top 10 most common values in each column'
    },
    {
      title: 'Missing data',
      description: 'Find NULLs and empty fields',
      icon: 'warning',
      prompt: 'Find records with NULL or empty values'
    }
  ];
  public aiSuggestions: { title: string; prompt: string }[] = [];
  public submitting: boolean = false;
  public isExpanded: boolean = false;
  public textareaRows: number = 4;

  private _currentRequest: Subscription = null;

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
    this.generateSuggestions();
  }

  ngOnChanges(): void {
    this.generateSuggestions();
  }

  async ngAfterViewInit() {
    const mermaid = await import("mermaid")
    //@ts-expect-error dynamic load of mermaid
    window.mermaid = mermaid.default ?? mermaid;
  };

  ngOnDestroy() {
    this.cancelRequest();
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

      this.messagesChain.push({
        type: 'ai-error',
        text: 'Request cancelled'
      });

      this.angulartics2.eventTrack.next({
        action: 'AI panel: request cancelled',
      });
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
        this._currentRequest = null;
      },
      () => {
        this.submitting = false;
        this._currentRequest = null;
      }
    );
  }

  sendMessage(suggestedMessage?: string): void {
    if (suggestedMessage) {
      this.message = suggestedMessage;
    }
    this.submitting = true;
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
        this._currentRequest = null;
        this.angulartics2.eventTrack.next({
          action: 'AI panel: message sent and returned an error',
        });
      },
      () => {
        this.submitting = false;
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

  private generateSuggestions(): void {
    if (!this.tableColumns || this.tableColumns.length === 0) {
      this.aiSuggestions = [];
      return;
    }

    const suggestions: { title: string; prompt: string }[] = [];
    const columns = this.tableColumns.slice(0, 5);

    columns.forEach(column => {
      const columnName = this.formatColumnName(column);

      if (column.toLowerCase().includes('date') || column.toLowerCase().includes('time') || column.toLowerCase().includes('created') || column.toLowerCase().includes('updated')) {
        suggestions.push({
          title: `Analyze ${columnName} trends`,
          prompt: `Analyze trends and patterns in the "${column}" column over time`
        });
      } else if (column.toLowerCase().includes('status') || column.toLowerCase().includes('state') || column.toLowerCase().includes('type')) {
        suggestions.push({
          title: `${columnName} distribution`,
          prompt: `Show the distribution of values in the "${column}" column`
        });
      } else if (column.toLowerCase().includes('price') || column.toLowerCase().includes('amount') || column.toLowerCase().includes('cost') || column.toLowerCase().includes('total')) {
        suggestions.push({
          title: `${columnName} statistics`,
          prompt: `Calculate statistics (min, max, average, sum) for the "${column}" column`
        });
      } else if (column.toLowerCase().includes('email') || column.toLowerCase().includes('name') || column.toLowerCase().includes('user')) {
        suggestions.push({
          title: `Unique ${columnName}`,
          prompt: `How many unique values are in the "${column}" column?`
        });
      } else {
        suggestions.push({
          title: `Analyze ${columnName}`,
          prompt: `What are the most common values in the "${column}" column?`
        });
      }
    });

    this.aiSuggestions = suggestions.slice(0, 3);
  }

  private formatColumnName(column: string): string {
    return column
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
