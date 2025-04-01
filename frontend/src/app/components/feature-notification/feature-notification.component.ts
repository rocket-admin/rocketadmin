import { Component, EventEmitter, Output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-feature-notification',
  imports: [
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './feature-notification.component.html',
  styleUrl: './feature-notification.component.css'
})
export class FeatureNotificationComponent {
  @Output() dismiss = new EventEmitter<void>();
}
