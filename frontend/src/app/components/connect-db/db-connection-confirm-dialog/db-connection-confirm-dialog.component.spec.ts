import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { Angulartics2Module } from 'angulartics2';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DbConnectionConfirmDialogComponent } from './db-connection-confirm-dialog.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { RouterTestingModule } from "@angular/router/testing";
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';

describe('DbConnectionConfirmDialogComponent', () => {
  let component: DbConnectionConfirmDialogComponent;
  let fixture: ComponentFixture<DbConnectionConfirmDialogComponent>;

  let routerSpy;
  let fakeConnectionsService = jasmine.createSpyObj('connectionsService', ['updateConnection', 'createConnection']);

  beforeEach(async (): Promise<void> => {
    routerSpy = {navigate: jasmine.createSpy('navigate')};

    await TestBed.configureTestingModule({
    imports: [
      RouterTestingModule.withRoutes([]),
      MatSnackBarModule,
      MatDialogModule,
      Angulartics2Module.forRoot(),
      DbConnectionConfirmDialogComponent
    ],
    providers: [
      provideHttpClient(),
      { provide: MAT_DIALOG_DATA, useValue: {
              dbCreds: {
                  id: '12345678'
              }
          } },
      { provide: MatDialogRef, useValue: {} },
      { provide: Router, useValue: routerSpy },
      {
          provide: ConnectionsService,
          useValue: fakeConnectionsService
      }
    ],
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DbConnectionConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirect on dashboard after connection edited', () => {
    fakeConnectionsService.updateConnection.and.returnValue(of(true));
    component.editConnection();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard/12345678']);
  });

  it('should stop submitting if editing connection completed', () => {
    fakeConnectionsService.updateConnection.and.returnValue(of(false));
    component.editConnection();

    expect(component.submitting).toBeFalse();
  });

  it('should redirect on dashboard after connection added', () => {
    fakeConnectionsService.createConnection.and.returnValue(of({
      id: '12345678'
    }));
    component.createConnection();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard/12345678']);
  });

  it('should stop submitting if adding connection completed', () => {
    fakeConnectionsService.createConnection.and.returnValue(of(false));
    component.createConnection();

    expect(component.submitting).toBeFalse();
  });
});
