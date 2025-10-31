import { Component, EventEmitter, Injectable, Input, OnInit, Output } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

@Injectable()
@Component({
  selector: 'app-foreign-key-record-view',
  templateUrl: './foreign-key.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './foreign-key.component.css'],
  imports: [MatIconModule, RouterModule, CommonModule]
})
export class ForeignKeyRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
  @Input() link: string;
  @Input() primaryKeysParams: any;
  @Input() displayValue: string;

  @Output() onForeignKeyClick = new EventEmitter<{foreignKey: any, value: string}>();

  public foreignKeyURLParams: any;

  constructor() {
    super();
  }

  ngOnInit() {
    this.foreignKeyURLParams = {...this.primaryKeysParams, mode: 'view'}
  }
}
