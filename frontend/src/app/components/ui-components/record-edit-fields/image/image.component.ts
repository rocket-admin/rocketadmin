import { Component, Input, OnInit } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UrlValidatorDirective } from 'src/app/directives/url-validator.directive';

@Component({
  selector: 'app-edit-image',
  templateUrl: './image.component.html',
  styleUrl: './image.component.css',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    UrlValidatorDirective
  ]
})
export class ImageEditComponent extends BaseEditFieldComponent implements OnInit {
  @Input() value: string;
  public prefix: string = '';

  ngOnInit(): void {
    super.ngOnInit();
    this._parseWidgetParams();
  }

  ngOnChanges(): void {
    this._parseWidgetParams();
  }

  private _parseWidgetParams(): void {
    if (this.widgetStructure?.widget_params) {
      try {
        const params = typeof this.widgetStructure.widget_params === 'string' 
          ? JSON.parse(this.widgetStructure.widget_params) 
          : this.widgetStructure.widget_params;
        
        if (params.prefix !== undefined) {
          this.prefix = params.prefix || '';
        }
      } catch (e) {
        console.error('Error parsing Image widget params:', e);
      }
    }
  }

  get imageUrl(): string {
    if (!this.value) return '';
    return this.prefix + this.value;
  }
}
