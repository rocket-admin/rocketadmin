import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PlaceholderTableDataComponent } from '../placeholder-table-data/placeholder-table-data.component';

@Component({
  selector: 'app-placeholder-company',
  templateUrl: './placeholder-company.component.html',
  styleUrls: ['./placeholder-company.component.css'],
  imports: [
    CommonModule,
    PlaceholderTableDataComponent
  ]
})
export class PlaceholderCompanyComponent {

}
