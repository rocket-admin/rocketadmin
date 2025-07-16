import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-point-display',
  templateUrl: './point.component.html',
  styleUrls: ['./point.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class PointDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  static type = 'point';
  
  formattedPoint: string;
  
  override ngOnInit() {
    super.ngOnInit();
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
