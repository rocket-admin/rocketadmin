import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MarkdownService } from 'ngx-markdown';
import { ConnectionsService } from 'src/app/services/connections.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { TableStateService } from 'src/app/services/table-state.service';
import { TablesService } from 'src/app/services/tables.service';

@Component({
  selector: 'app-db-table-ai-panel',
  templateUrl: './db-table-ai-panel.component.html',
  styleUrl: './db-table-ai-panel.component.css'
})
export class DbTableAiPanelComponent implements OnInit {

  public connectionID: string;
  public tableName: string;
  public isAIpanelOpened: boolean = false;
  public message: string;
  // public response: string = null;
  public messageChain: {
    type: string;
    text: string
  }[] = [];
  public submitting: boolean = false;

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _tableState: TableStateService,
    private _notifications: NotificationsService,
    private markdownService: MarkdownService
  ) { }

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;

    this._tableState.aiPanelCast.subscribe((isAIpanelOpened) => {
      this.isAIpanelOpened = isAIpanelOpened;
    });
  }

  onKeydown(event: KeyboardEvent): void {
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

  sendMessage() {
    this.submitting = true;
    this.messageChain.push({
      type: 'user',
      text: this.message
    });
    const messageCopy = this.message;
    this.message = '';
    this._tables.requestAI(this.connectionID, this.tableName, messageCopy).subscribe((response) => {
      this.messageChain.push({
        type: 'ai',
        text: this.markdownService.parse(response.response_message) as string
      });
      this.submitting = false;
    },
      () => {
        this.submitting = false;
      },
      () => {
        this.submitting = false;
      })
  }

  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  handleClose() {
    this._tableState.handleViewAIpanel();
  }
}
