import { Angulartics2, Angulartics2Module } from 'angulartics2';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { ConnectionsService } from 'src/app/services/connections.service';
import { DbConnectionDeleteDialogComponent } from './db-connection-delete-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { RouterTestingModule } from "@angular/router/testing";
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';

xdescribe('DbConnectionDeleteDialogComponent', () => {
  let component: DbConnectionDeleteDialogComponent;
  let fixture: ComponentFixture<DbConnectionDeleteDialogComponent>;
  let routerSpy;
  let fakeConnectionsService = jasmine.createSpyObj('connectionsService', ['deleteConnection']);

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async (): Promise<void> => {
    routerSpy = {navigate: jasmine.createSpy('navigate')};

    await TestBed.configureTestingModule({
    imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule,
        FormsModule,
        MatRadioModule,
        Angulartics2Module.forRoot(),
        DbConnectionDeleteDialogComponent
    ],
    providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: Router, useValue: routerSpy },
        {
            provide: ConnectionsService,
            useValue: fakeConnectionsService
        },
        Angulartics2
    ],
  }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DbConnectionDeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close confirmation dilog and redirect to connection list if deleting is successfull', () => {
    fakeConnectionsService.deleteConnection.and.returnValue(of(true));
    spyOn(component.dialogRef, 'close');

    component.deleteConnection();

    expect(component.submitting).toBeFalse();
    expect(component.dialogRef.close).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/connections-list']);
  });

  it('should stop submitting if deleting is completed', () => {
    fakeConnectionsService.deleteConnection.and.returnValue(of(false));

    component.deleteConnection();

    expect(component.submitting).toBeFalse();
  });
});
