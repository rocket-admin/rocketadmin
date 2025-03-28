import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { UiSettingsService } from 'src/app/services/ui-settings.service';

@Component({
  selector: 'app-feature-notification',
  imports: [
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './feature-notification.component.html',
  styleUrl: './feature-notification.component.css'
})
export class FeatureNotificationComponent implements OnInit {
  public isDismissed: boolean = false;

  constructor(
    private _uiSettings: UiSettingsService,
  ) {}

  ngOnInit() {

  }

  dismissNotification() {
  }
}
