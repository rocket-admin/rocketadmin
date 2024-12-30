import { Component, Input, OnInit } from '@angular/core';

import { Alert } from 'src/app/models/alert';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationsService } from 'src/app/services/notifications.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.css'],
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterModule],
})
export class AlertComponent implements OnInit {
  @Input() alert: Alert;

  public messageAbstract: string;
  public messageDetails: string;

  public icons = {
    error: 'error_outline',
    warning: 'warning_amber',
    info: 'info_outline',
    success: 'task_alt'
  }

  constructor(
    private _notifications: NotificationsService,
  ) { }

  get currentAlert(): Alert {
    return this.alert || this._notifications.currentAlert;
  }

  ngOnInit(): void {
    console.log(this.currentAlert);
  }

  onButtonClick(alert: Alert, action) {
    action.action(alert.id);
  }

  getMessageType() {
    if (this.currentAlert.message === null) return;
    if (typeof this.currentAlert.message === 'string') return 'plainMessage';
    if (this.currentAlert.message.abstract && !this.currentAlert.message.details) {
      this.currentAlert.message = this.currentAlert.message.abstract;
      return 'plainMessage'
    };
    if (this.currentAlert.message.details) {
      this.messageAbstract = this.currentAlert.message.abstract;
      this.messageDetails = this.currentAlert.message.details;
      return 'complexMessage'
    };
  }
}
