import { Component, Input, OnInit } from '@angular/core';

import { AlertType } from 'src/app/models/alert';

@Component({
  selector: 'app-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.css']
})
export class BannerComponent implements OnInit {
  @Input() type: AlertType;


  constructor(
  ) { }


  ngOnInit(): void {}
}
