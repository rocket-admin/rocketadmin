import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DbConnectionDeleteDialogComponent } from '../db-connection-delete-dialog/db-connection-delete-dialog.component';
import { environment } from 'src/environments/environment';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-db-connection-confirm-dialog',
  templateUrl: './db-connection-confirm-dialog.component.html',
  styleUrls: ['./db-connection-confirm-dialog.component.css'],
  imports: [
    NgIf,
    MatDialogModule,
    MatButtonModule
  ]
})
export class DbConnectionConfirmDialogComponent implements OnInit {

  public isSaas = (environment as any).saas;
  public submitting: boolean = false;
  public providerNames = {
    amazon: 'Amazon Web Services',
    azure: 'Microsoft Azure',
    google: 'Google Cloud Platform',
    mongoatlas: 'MongoDB Atlas',
    digitalocean: 'DigitalOcean',
  };
  public providerDocsLink = {
    amazon: 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection/create_aws_mysql',
    azure: 'https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-manage-firewall-portal',
    google: 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection/create_google_cloud',
    mongoatlas: 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection/create_mongo_atlas',
    digitalocean: 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection/create_digitalocean_postgresql',
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _connections: ConnectionsService,
    public dialogRef: MatDialogRef<DbConnectionDeleteDialogComponent>,
    public router: Router,
  ) { }

  ngOnInit(): void {}

  editConnection() {
    this._connections.updateConnection(this.data.dbCreds, this.data.masterKey)
      .subscribe(() => {
        this.router.navigate([`/dashboard/${this.data.dbCreds.id}`]);
      }, undefined, () => {
        this.submitting = false;
      })
  }

  createConnection() {
    this._connections.createConnection(this.data.dbCreds, this.data.masterKey)
      .subscribe((res: any) => {
          const connectionID = res.id!;
          this.router.navigate([`/dashboard/${connectionID}`]);
        },
        undefined,
        () => {this.submitting = false}
      )
  }

  openIntercome() {
    // @ts-ignore
    Intercom('show');
  }
}
