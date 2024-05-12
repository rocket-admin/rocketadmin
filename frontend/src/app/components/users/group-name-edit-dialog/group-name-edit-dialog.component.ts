import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UsersService } from 'src/app/services/users.service';
import { GroupAddDialogComponent } from '../group-add-dialog/group-add-dialog.component';

@Component({
  selector: 'app-group-name-edit-dialog',
  templateUrl: './group-name-edit-dialog.component.html',
  styleUrls: ['./group-name-edit-dialog.component.css']
})
export class GroupNameEditDialogComponent {
  public connectionID: string;
  public groupTitle: string = '';
  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public group: any,
    public _usersService: UsersService,
    public dialogRef: MatDialogRef<GroupAddDialogComponent>
  ) { }

  ngOnInit(): void {
    this.groupTitle = this.group.title;
    this._usersService.cast.subscribe();
  }

  addGroup() {
    this.submitting = true;
    this._usersService.editUsersGroupName(this.group.id, this.groupTitle)
    .subscribe(
      () => {
        this.submitting = false;
        this.dialogRef.close();
      },
      () => { },
      () => { this.submitting = false; }
    );
  }
}
