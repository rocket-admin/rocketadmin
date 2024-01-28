import { Component } from '@angular/core';

@Component({
  selector: 'app-placeholder-table-data',
  templateUrl: './placeholder-table-data.component.html',
  styleUrls: ['./placeholder-table-data.component.css']
})
export class PlaceholderTableDataComponent {
  public numberOfDivs = Array.from({ length: 42 }, (_, index) => index);

}
