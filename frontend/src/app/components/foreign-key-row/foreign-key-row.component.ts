import { Component, Input, OnInit } from '@angular/core';

import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-foreign-key-row',
  templateUrl: './foreign-key-row.component.html',
  styleUrls: ['./foreign-key-row.component.scss']
})
export class ForeignKeyRowComponent implements OnInit {
  @Input() form: FormGroup;
  @Input() field: any;
  @Input() options: any[];

  constructor() { }

  ngOnInit(): void {
  }

  trackByFn(index: number, item: any): any {
    return item.id || index; // Adjust based on unique identifier
  }
}