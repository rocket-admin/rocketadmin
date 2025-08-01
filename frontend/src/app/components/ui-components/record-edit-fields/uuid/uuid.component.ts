import { Component, Injectable, Input, OnInit } from '@angular/core';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { v1 as uuidv1, v4 as uuidv4, v5 as uuidv5, v3 as uuidv3, v7 as uuidv7, validate as uuidValidate, version as uuidVersion } from 'uuid';

@Injectable()

@Component({
  selector: 'app-edit-uuid',
  templateUrl: './uuid.component.html',
  styleUrls: ['./uuid.component.css'],
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    FormsModule
  ]
})
export class UuidEditComponent extends BaseEditFieldComponent implements OnInit {
  @Input() value: string;
  
  static type = 'uuid';
  
  public uuidVersion: string = 'v4';
  public isCreateMode: boolean = true;
  public namespace: string = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Default DNS namespace
  public name: string = '';
  
  // Available UUID versions
  public availableVersions = [
    { value: 'v1', label: 'v1 (timestamp + MAC)', description: 'Timestamp and MAC address based' },
    { value: 'v3', label: 'v3 (MD5 hash)', description: 'MD5 hash of namespace and name' },
    { value: 'v4', label: 'v4 (random)', description: 'Random UUID (most common)' },
    { value: 'v5', label: 'v5 (SHA-1 hash)', description: 'SHA-1 hash of namespace and name' },
    { value: 'v7', label: 'v7 (timestamp)', description: 'Timestamp-based sortable UUID' }
  ];
  
  // Standard namespaces for v3/v5
  public namespaces = [
    { value: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', label: 'DNS' },
    { value: '6ba7b811-9dad-11d1-80b4-00c04fd430c8', label: 'URL' },
    { value: '6ba7b812-9dad-11d1-80b4-00c04fd430c8', label: 'OID' },
    { value: '6ba7b814-9dad-11d1-80b4-00c04fd430c8', label: 'X500' }
  ];
  
  ngOnInit(): void {
    super.ngOnInit();
    
    // Determine if we're in create or update mode
    this.isCreateMode = !this.value || this.value === '';
    
    // Parse widget parameters
    if (this.widgetStructure?.widget_params) {
      try {
        const params = typeof this.widgetStructure.widget_params === 'string' 
          ? JSON.parse(this.widgetStructure.widget_params) 
          : this.widgetStructure.widget_params;
        
        if (params.version) {
          this.uuidVersion = params.version;
        }
        if (params.namespace) {
          this.namespace = params.namespace;
        }
        if (params.name) {
          this.name = params.name;
        }
      } catch (e) {
        console.error('Error parsing UUID widget params:', e);
      }
    }
    
    // Generate UUID on create
    if (this.isCreateMode) {
      this.generateUuid();
    }
  }
  
  generateUuid(): void {
    let uuid = '';
    
    try {
      switch (this.uuidVersion) {
        case 'v1':
          uuid = uuidv1();
          break;
        case 'v3':
          if (this.name) {
            uuid = uuidv3(this.name, this.namespace);
          } else {
            uuid = uuidv3(Date.now().toString(), this.namespace);
          }
          break;
        case 'v4':
          uuid = uuidv4();
          break;
        case 'v5':
          if (this.name) {
            uuid = uuidv5(this.name, this.namespace);
          } else {
            uuid = uuidv5(Date.now().toString(), this.namespace);
          }
          break;
        case 'v7':
          uuid = uuidv7();
          break;
        default:
          uuid = uuidv4();
      }
      
      this.value = uuid;
      this.onFieldChange.emit(this.value);
    } catch (error) {
      console.error('Error generating UUID:', error);
      // Fallback to v4
      this.value = uuidv4();
      this.onFieldChange.emit(this.value);
    }
  }
  
  validateUuid(value: string): boolean {
    return uuidValidate(value);
  }
  
  getUuidVersion(value: string): number | false {
    try {
      return uuidVersion(value);
    } catch {
      return false;
    }
  }
}