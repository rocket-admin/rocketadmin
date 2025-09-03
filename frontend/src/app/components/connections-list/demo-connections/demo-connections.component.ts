import { Component, Input, OnInit } from '@angular/core';
import { supportedDatabasesTitles, supportedOrderedDatabases } from 'src/app/consts/databases';

import { Angulartics2Module } from 'angulartics2';
import { CommonModule } from '@angular/common';
import { ConnectionItem } from 'src/app/models/connection';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

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
export class DemoConnectionsComponent implements OnInit {
  @Input() testConnections: ConnectionItem[] = [];
  @Input() isDemo: boolean = false;

  public testDatabasesNames = supportedDatabasesTitles;

  public testDatabasesIcons = {
    mysql: "/assets/icons/test-connections-icons/diversity_2.svg",
    postgres: "/assets/icons/test-connections-icons/set_meal.svg",
    mongodb: "/assets/icons/test-connections-icons/cinematic_blur.svg",
    dynamodb: "/assets/icons/test-connections-icons/box.svg",
    oracledb: "/assets/icons/test-connections-icons/shopping_bag_speed.svg",
    mssql: "/assets/icons/test-connections-icons/add_shopping_cart.svg",
  }

  ngOnInit() {
    if (this.testConnections && this.testConnections.length > 0) {
      this.testConnections = this.orderTestDatabases();
    }
  }

  orderTestDatabases() {
  if (!this.testConnections || !Array.isArray(this.testConnections) || this.testConnections.length === 0) {
    return [];
  }

  const orderMap = new Map(supportedOrderedDatabases.map((db, index) => [db, index]));

  return [...this.testConnections].sort((a, b) => {
    const typeA = a.connection?.type;
    const typeB = b.connection?.type;

    if (!typeA || !typeB) {
      return 0;
    }

    const indexA = orderMap.has(typeA) ? orderMap.get(typeA) : Infinity;
    const indexB = orderMap.has(typeB) ? orderMap.get(typeB) : Infinity;

    return indexA - indexB;
  });
}
}
