import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';

import { BbBulkActionConfirmationDialogComponent } from './db-bulk-action-confirmation-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from "@angular/router/testing";
import { of } from 'rxjs';
import { TablesService } from 'src/app/services/tables.service';

describe('BbBulkActionConfirmationDialogComponent', () => {
  let component: BbBulkActionConfirmationDialogComponent;
  let fixture: ComponentFixture<BbBulkActionConfirmationDialogComponent>;
  let tablesService: TablesService;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BbBulkActionConfirmationDialogComponent ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {
          primaryKeys: [{
            column_name: 'id'
          }],
          selectedRows: [{
            'id': '1234',
            'name': 'Anna'
          },
          {
            'id': '5678',
            'name': 'John'
          }
        ]
        } },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BbBulkActionConfirmationDialogComponent);
    component = fixture.componentInstance;
    tablesService = TestBed.inject(TablesService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call delete rows if no action id', () => {
    component.connectionID = '12345678';
    component.selectedTableName = 'users';
    component.data.title = 'delete rows';
    component.data.primaryKeys = [{id: 1}, {id: 2}, {id: 3}];
    const fakeDeleteRows = spyOn(tablesService, 'bulkDelete').and.returnValue(of());

    component.handleConfirmedActions();

    expect(fakeDeleteRows).toHaveBeenCalledOnceWith('12345678', 'users', [ { id: '1234' }, { id: '5678' } ]);
    expect(component.submitting).toBeFalse();
  });
});
