import { Component, OnInit, Input } from '@angular/core';
import { Alert } from 'src/app/models/alert';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.css']
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
