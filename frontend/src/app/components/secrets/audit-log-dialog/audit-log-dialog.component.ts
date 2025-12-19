import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SecretsService } from 'src/app/services/secrets.service';
import { Secret, AuditLogEntry, SecretPagination } from 'src/app/models/secret';

@Component({
  selector: 'app-audit-log-dialog',
  templateUrl: './audit-log-dialog.component.html',
  styleUrls: ['./audit-log-dialog.component.css'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ]
})
export class AuditLogDialogComponent implements OnInit {
  public logs: AuditLogEntry[] = [];
  public pagination: SecretPagination = {
    total: 0,
    currentPage: 1,
    perPage: 20,
    lastPage: 1,
  };
  public loading = true;
  public displayedColumns = ['action', 'user', 'accessedAt', 'success'];

  public actionLabels: Record<string, string> = {
    create: 'Created',
    view: 'Viewed',
    copy: 'Copied',
    update: 'Updated',
    delete: 'Deleted',
  };

  public actionIcons: Record<string, string> = {
    create: 'add_circle',
    view: 'visibility',
    copy: 'content_copy',
    update: 'edit',
    delete: 'delete',
  };

  public actionColors: Record<string, string> = {
    create: 'primary',
    view: 'accent',
    copy: 'accent',
    update: 'primary',
    delete: 'warn',
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { secret: Secret },
    private dialogRef: MatDialogRef<AuditLogDialogComponent>,
    private _secrets: SecretsService
  ) {}

  ngOnInit(): void {
    this.loadAuditLog();
  }

  loadAuditLog(): void {
    this.loading = true;
    this._secrets.getAuditLog(
      this.data.secret.slug,
      this.pagination.currentPage,
      this.pagination.perPage
    ).subscribe(response => {
      if (response) {
        this.logs = response.data;
        this.pagination = response.pagination;
      }
      this.loading = false;
    });
  }

  onPageChange(event: PageEvent): void {
    this.pagination.currentPage = event.pageIndex + 1;
    this.pagination.perPage = event.pageSize;
    this.loadAuditLog();
  }
}
