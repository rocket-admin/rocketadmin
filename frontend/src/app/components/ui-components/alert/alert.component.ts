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

  public icons = {
    error: 'error_outline',
    warning: 'warning_amber',
    info: 'info_outline',
    success: 'task_alt'
  }

  constructor(
    private _notifications: NotificationsService,
  ) { }

  get currentAlert() {
    return this.alert || this._notifications.currentAlert;
  }

  ngOnInit(): void {
  }

  onButtonClick(alert: Alert, action) {
    action.action(alert.id);
  }

}
