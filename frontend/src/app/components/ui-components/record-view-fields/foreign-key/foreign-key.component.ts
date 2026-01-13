import { Component, EventEmitter, Injectable, Input, OnInit, Output } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
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

  ngOnInit() {
    this.foreignKeyURLParams = {...this.primaryKeysParams, mode: 'view'}
  }
}
