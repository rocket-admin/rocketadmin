import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AccountDeleteConfirmationComponent } from '../account-delete-confirmation/account-delete-confirmation.component';

@Component({
  selector: 'app-account-delete-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule
  ],
  templateUrl: './account-delete-dialog.component.html',
  styleUrls: ['./account-delete-dialog.component.css']
})
export class AccountDeleteDialogComponent implements OnInit {

  public userEmail: string;
  public reason: string;
  public message: string;
  public reasonsList = [
    {
      id: 'missing-features',
      caption: 'Missing features I need',
      message: 'Perhaps Rocketadmin has updated the functions you need and they are in a different place. ' +
        'Our <strong>Support team</strong> will advise you.'
    },
    {
      id: 'technical-issues',
      caption: 'Technical  issues',
      message: 'If you have technical problems, please contact our <strong>Support team</strong> and we will solve your problem.'
    },
    {
      id: 'another-product',
      caption: 'Another product',
      message: 'If you are interested in another product, you can read <a href="https://help.rocketadmin.com/comparisons-with-other-database-admin-tools">the article</a> where they compare'
    },
    {
      id: 'privacy-concern',
      caption: 'I have privacy concern',
      message: 'If you have any doubts about the security of your data, please contact our <strong>Support team</strong>.'
    },
    {
      id: 'money-value',
      caption: 'I`m not getting value from my membership.',
      message: 'If you have other membership needs, you can always choose another <a href="https://app.rocketadmin.com/upgrade">trial plan</a>.'
    },
    {
      id: 'other',
      caption: 'Other'
    }
  ]

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<AccountDeleteDialogComponent>,
  ) { }

  ngOnInit(): void {
    this.userEmail = this.data.email;
  }

  openDeleteConfirmation() {
    const metadata = {
      reason: this.reason,
      message: this.message
    };

    this.dialog.open(AccountDeleteConfirmationComponent, {
      width: '20em',
      data: metadata
    });

    this.dialogRef.close();
  }
}
