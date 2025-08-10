import { Component, Injectable, OnInit } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@Injectable()
@Component({
  selector: 'app-point-record-view',
  templateUrl: './point.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './point.component.css'],
  imports: [MatTooltipModule]
})
export class PointRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
  static type = 'point';

  formattedPoint: string;

  ngOnInit() {
    this.formatPoint();
  }

  private formatPoint() {
    if (!this.value) {
      this.formattedPoint = '';
      return;
    }

    try {
      if (typeof this.value === 'string') {
        // Handle string format like "(x,y)" or "x,y"
        const pointStr = this.value.trim().replace(/[()]/g, '');
        const [x, y] = pointStr.split(',').map(coord => parseFloat(coord.trim()));
        this.formattedPoint = `(${x}, ${y})`;
      } else if (typeof this.value === 'object') {
        // Handle object format like {x: 1, y: 2}
        const x = this.value.x || this.value[0];
        const y = this.value.y || this.value[1];
        this.formattedPoint = `(${x}, ${y})`;
      }
    } catch (e) {
      this.formattedPoint = String(this.value);
    }
  }
}
