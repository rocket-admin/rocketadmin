import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { ConnectionItem } from 'src/app/models/connection';

@Component({
  selector: 'app-demo-connections',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    Angulartics2Module
  ],
  templateUrl: './demo-connections.component.html',
  styleUrl: './demo-connections.component.css'
})
export class DemoConnectionsComponent {
  @Input() testConnections: ConnectionItem[] = null;
  @Input() isDemo: boolean = false;
}
