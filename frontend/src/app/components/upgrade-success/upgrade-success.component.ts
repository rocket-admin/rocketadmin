import { Component, OnInit } from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { BannerComponent } from '../ui-components/banner/banner.component';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-upgrade-success',
  imports: [CommonModule, MatButtonModule, BannerComponent],
  templateUrl: './upgrade-success.component.html',
  styleUrls: ['./upgrade-success.component.css']
})
export class UpgradeSuccessComponent implements OnInit {

  public newPlan: string;

  constructor(
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.newPlan = this.route.snapshot.queryParams.plan;
  }
}
