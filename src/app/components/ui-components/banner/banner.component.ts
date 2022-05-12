import { Component, Input, OnInit } from '@angular/core';
import { Banner } from 'src/app/models/banner';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
  selector: 'app-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.css']
})
export class BannerComponent implements OnInit {
  @Input() banner: Banner;

  public icons = {
    error: 'error_outline',
    warning: 'warning_amber',
    info: 'info_outline',
    succes: 'task_alt'
  }

  constructor(
    private _notifications: NotificationsService,
  ) { }

  get currentBanner() {
    return this.banner || this._notifications.currentBanner;
  }

  ngOnInit(): void {}

  onButtonClick(banner: Banner, action) {
    action.action(banner.id);
  }
}
