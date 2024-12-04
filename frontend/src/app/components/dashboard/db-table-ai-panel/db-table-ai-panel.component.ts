import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Angulartics2 } from 'angulartics2';
import { MarkdownService } from 'ngx-markdown';
import { ConnectionsService } from 'src/app/services/connections.service';
import { TableStateService } from 'src/app/services/table-state.service';
import { TablesService } from 'src/app/services/tables.service';

@Component({
  selector: 'app-db-table-ai-panel',
  templateUrl: './db-table-ai-panel.component.html',
  styleUrl: './db-table-ai-panel.component.css'
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

  sendMessage() {
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
      () => {
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
