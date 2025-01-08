import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { Angulartics2, Angulartics2Module } from 'angulartics2';
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
import { MatListModule } from '@angular/material/list';

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
    MatListModule,
    MatButtonModule,
    Angulartics2Module
  ]
})
export class DbTableAiPanelComponent implements OnInit, OnDestroy {

  @Input() public displayName: string;
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  public connectionID: string;
  public tableName: string;
  public isAIpanelOpened: boolean = false;
  public message: string = '';
  public charactrsNumber: number = 0;
  public messagesChain: {
    type: string;
    text: string
  }[] = [];
  public aiRequestSuggestions: string[] = [
    'How many records were created last month?',
    'Are there any duplicate rows in this table?',
    // 'Are there any columns with inconsistent data types?',
    'Which columns have empty values?',
    'What trends can you predict based on this table?'
  ]
  public submitting: boolean = false;

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
  }

  ngOnDestroy() {
    this.angulartics2.eventTrack.next({
      action: 'AI panel: destroyed',
      properties: {
        messagesLength: this.messagesChain.length
      }
    });
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
        this.sendMessage();
      }
    }
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
    this._tables.requestAI(this.connectionID, this.tableName, messageCopy).subscribe((response) => {
      this.messagesChain.push({
        type: 'ai',
        text: this.markdownService.parse(response.response_message) as string
      });
      this.submitting = false;

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
        this.angulartics2.eventTrack.next({
          action: 'AI panel: message sent and returned an error',
        });
      },
      () => {
        this.submitting = false;
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
}
