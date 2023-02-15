import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-db-action-link-dialog',
  templateUrl: './db-action-link-dialog.component.html',
  styleUrls: ['./db-action-link-dialog.component.css']
})
export class DbActionLinkDialogComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public location: any,
  ) { }

  ngOnInit(): void {
  }

}
