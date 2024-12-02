import { Component, OnInit } from '@angular/core';
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
  public response: string = null;
  public submitting: boolean = false;

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _tableState: TableStateService,
    private _notifications: NotificationsService,
  ) { }

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
        // Add a new line
        event.preventDefault(); // Prevent the default form submission
        const textarea = event.target as HTMLTextAreaElement;
        const cursorPos = textarea.selectionStart;
        this.message =
          this.message.substring(0, cursorPos) + '\n' + this.message.substring(cursorPos);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
        });
      } else {
        // Prevent default "Enter" key behavior
        event.preventDefault();
        // Submit the form
        this.sendMessage();
      }
    }
  }

  sendMessage() {
    this.submitting = true;
    this._tables.requestAI(this.connectionID, this.tableName, this.message).subscribe((response) => {
      this.response = response.response_message;
      this.submitting = false;
    });
  }

  handleClose() {
    this._tableState.handleViewAIpanel();
  }
}
