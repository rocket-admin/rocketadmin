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

  it('should process rows and get primary keys array', () => {
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.selectedRows).toEqual([ { id: '1234' }, { id: '5678' } ]);
  });

  it('should return only primary keys of the row', () => {
    const mockRow = {
      id: '1357',
      name: 'Anna',
      age: 15
    }

    const primaryKey = component.getPrimaryKey(mockRow);

    expect(primaryKey).toEqual({ id: '1357' });
  });

  it('should should call delete rows', () => {
    component.connectionID = '12345678';
    component.selectedTableName = 'users';
    const fakeDeleteRows = spyOn(tablesService, 'bulkDelete').and.returnValue(of());

    component.deleteRows();

    expect(fakeDeleteRows).toHaveBeenCalledOnceWith('12345678', 'users', [ { id: '1234' }, { id: '5678' } ]);
    expect(component.submitting).toBeFalse();
  });
});
