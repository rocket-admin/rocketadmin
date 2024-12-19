import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PlaceholderTableDataComponent } from '../placeholder-table-data/placeholder-table-data.component';

@Component({
  selector: 'app-placeholder-table-view',
  templateUrl: './placeholder-table-view.component.html',
  styleUrls: ['./placeholder-table-view.component.css'],
  imports: [CommonModule, PlaceholderTableDataComponent]
})
export class PlaceholderTableViewComponent {

}
