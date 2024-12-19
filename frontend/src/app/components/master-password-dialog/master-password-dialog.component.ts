import { Component, OnInit } from '@angular/core';

import { ConnectionsService } from 'src/app/services/connections.service';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';

@Component({
  selector: 'app-master-password-dialog',
  templateUrl: './master-password-dialog.component.html',
  styleUrls: ['./master-password-dialog.component.css'],
  imports: [FormsModule, MatDialogModule, MatInputModule, MatButtonModule]
})
export class MasterPasswordDialogComponent implements OnInit {
  public password: string = '';
  public connectionID: string | null = null;

  constructor(
    public router: Router,
    private dialogRef: MatDialogRef<MasterPasswordDialogComponent>,
    private _connections: ConnectionsService,
  ) { }

  ngOnInit(): void {
    this.connectionID = this._connections.currentConnectionID;
  }

  enterMasterPassword() {
    localStorage.setItem(`${this.connectionID}__masterKey`, this.password);
    let currentUrl = this.router.url;
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate([currentUrl]);
    this.closeDialog();
  }

  closeDialog() {
    this.dialogRef.close();
  }

}
