import { Component, OnInit, Input } from '@angular/core';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
  selector: 'app-ip-address-button',
  templateUrl: './ip-address-button.component.html',
  styleUrls: ['./ip-address-button.component.css']
})
export class IpAddressButtonComponent implements OnInit {
  @Input() ip: string;

  constructor(
    private _notifications: NotificationsService
  ) { }

  ngOnInit(): void {
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
