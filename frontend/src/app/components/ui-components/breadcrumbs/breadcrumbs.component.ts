import { Component, Input, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.css'],
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule]
})
export class BreadcrumbsComponent implements OnInit {
  @Input() crumbs;

  constructor() { }

  ngOnInit(): void {

  }

}
