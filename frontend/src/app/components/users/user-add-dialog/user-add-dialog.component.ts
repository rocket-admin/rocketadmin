import { Component, OnInit, Inject } from '@angular/core';
import { UsersService } from 'src/app/services/users.service';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { UserGroup } from 'src/app/models/user';
import { Angulartics2 } from 'angulartics2';
import { CompanyService } from 'src/app/services/company.service';
import { UserService } from 'src/app/services/user.service';
import { differenceBy } from "lodash";
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { PlaceholderAddUserDialogComponent } from '../../skeletons/placeholder-add-user-dialog/placeholder-add-user-dialog.component';
import { NgForOf, NgIf } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-add-dialog',
  templateUrl: './user-add-dialog.component.html',
  styleUrls: ['./user-add-dialog.component.css'],
  imports: [
    NgIf,
    NgForOf,
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    RouterModule,
    PlaceholderAddUserDialogComponent
  ]
})
export class UserAddDialogComponent implements OnInit {

  public submitting: boolean = false;
  public groupUserEmail: string = '';
  public availableMembers = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _usersService: UsersService,
    private _userService: UserService,
    private _company: CompanyService,
    private angulartics2: Angulartics2,
    private dialogRef: MatDialogRef<UserAddDialogComponent>
  ) { }

  ngOnInit(): void {

  }

  joinGroupUser() {
    this.submitting = true;
    this._usersService.addGroupUser(this.data.group.id, this.groupUserEmail)
      .subscribe((res) => {
          this.dialogRef.close();
          this.submitting = false;
          this.angulartics2.eventTrack.next({
            action: 'User groups: user was added to group successfully',
          });
        },
        () => { },
        () => { this.submitting = false; }
      )
  }
}
