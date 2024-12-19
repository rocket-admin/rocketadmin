import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { UsersService } from 'src/app/services/users.service';
import { GroupAddDialogComponent } from '../group-add-dialog/group-add-dialog.component';

@Component({
  selector: 'app-group-name-edit-dialog',
  templateUrl: './group-name-edit-dialog.component.html',
  styleUrls: ['./group-name-edit-dialog.component.css'],
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule
  ]
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
