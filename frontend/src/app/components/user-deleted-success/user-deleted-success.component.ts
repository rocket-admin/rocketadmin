import { Component, OnInit } from '@angular/core';

import { BannerComponent } from '../ui-components/banner/banner.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-deleted-success',
  imports: [CommonModule, BannerComponent],
  templateUrl: './user-deleted-success.component.html',
  styleUrls: ['./user-deleted-success.component.css']
})
export class UserDeletedSuccessComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
