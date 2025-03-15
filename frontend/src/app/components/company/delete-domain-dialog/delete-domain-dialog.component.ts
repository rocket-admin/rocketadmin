import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Angulartics2 } from 'angulartics2';
import { CompanyService } from 'src/app/services/company.service';

@Component({
  selector: 'app-delete-domain-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './delete-domain-dialog.component.html',
  styleUrl: './delete-domain-dialog.component.css'
})
export class DeleteDomainDialogComponent {
  public submitting: boolean = false;

  constructor(
      @Inject(MAT_DIALOG_DATA) public data: any,
      public dialogRef: MatDialogRef<DeleteDomainDialogComponent>,
      public _company: CompanyService,
      private angulartics2: Angulartics2,
  ) { }

  deleteCompanyDomain() {
    this.submitting = true;
    this._company.deleteCustomDomain(this.data.companyId).subscribe(() => {
      this.angulartics2.eventTrack.next({
        action: 'Company: domain is deleted successfully',
      });
      this.submitting = false;
      this.dialogRef.close();
    },
    () => {},
    () => {this.submitting = false}
  );
  }
}
