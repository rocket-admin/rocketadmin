import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { LogAction, LogStatus } from 'src/app/models/logs';

import { InfoDialogComponent } from './info-dialog.component';

describe('InfoDialogComponent', () => {
  let component: InfoDialogComponent;
  let fixture: ComponentFixture<InfoDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InfoDialogComponent ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show block for added row details', () => {
    component.log = {
      Table: 'south_park_table',
      User: 'eric@cartman.ass',
      Action: 'added row',
      Date: '06/26/2021 7:22 PM',
      Status: LogStatus.Successfully,
      operationType: LogAction.Add,
      createdAt: '2021-06-26T07:22:00.603Z',
      prevValue: null,
      currentValue: {
        firstName: 'Kenny',
        secondName: 'Kenny McCormick',
        status: 'poor'
      },
    }
    component.ngOnInit();
    fixture.detectChanges();

    const oneRowDetails = fixture.debugElement.query(By.css('table[data-block="one-row-details"]'));
    expect(oneRowDetails).toBeTruthy();
  });

  it('should show block for deleted row details', () => {
    component.log = {
      Table: 'south_park_table',
      User: 'eric@cartman.ass',
      Action: 'deleted row',
      Date: '06/26/2021 7:22 PM',
      Status: LogStatus.Successfully,
      operationType: LogAction.Delete,
      createdAt: '2021-06-26T07:22:00.603Z',
      prevValue: null,
      currentValue: {
        firstName: 'Kenny',
        secondName: 'Kenny McCormick',
        status: 'poor'
      },
    }
    component.ngOnInit();
    fixture.detectChanges();

    const oneRowDetails = fixture.debugElement.query(By.css('table[data-block="one-row-details"]'));
    expect(oneRowDetails).toBeTruthy();
  });

  it('should show block for viewed row details', () => {
    component.log = {
      Table: 'south_park_table',
      User: 'eric@cartman.ass',
      Action: 'received row',
      Date: '06/26/2021 7:22 PM',
      Status: LogStatus.Successfully,
      operationType: LogAction.ReceiveRow,
      createdAt: '2021-06-26T07:22:00.603Z',
      prevValue: null,
      currentValue: {
        firstName: 'Kenny',
        secondName: 'Kenny McCormick',
        status: 'poor'
      },
    }
    component.ngOnInit();
    fixture.detectChanges();

    const oneRowDetailsNode = fixture.debugElement.query(By.css('table[data-block="one-row-details"]'));
    expect(oneRowDetailsNode).toBeTruthy();
  });

  it('should show block for comparison details of updated row', () => {
    component.log = {
      Table: 'south_park_table',
      User: 'eric@cartman.ass',
      Action: 'updated row',
      Date: '06/26/2021 7:22 PM',
      Status: LogStatus.Successfully,
      operationType: LogAction.Update,
      createdAt: '2021-06-26T07:22:00.603Z',
      prevValue: {
        firstName: 'Kenny',
        secondName: 'Kenny McCormick',
        status: 'poor'
      },
      currentValue: {
        firstName: 'Kenny',
        secondName: 'Kenny McCormick',
        status: 'poor and stupid'
      },
    }
    component.ngOnInit();
    fixture.detectChanges();

    const comparisonDetails = fixture.debugElement.query(By.css('div[data-block="comparison-details"]'));
    expect(comparisonDetails).toBeTruthy();
  });

  it('should show block with updated value, when prev value in unknown', () => {
    component.log = {
      Table: 'south_park_table',
      User: 'eric@cartman.ass',
      Action: 'updated row',
      Date: '06/26/2021 7:22 PM',
      Status: LogStatus.Successfully,
      operationType: LogAction.Update,
      createdAt: '2021-06-26T07:22:00.603Z',
      prevValue: null,
      currentValue: {
        firstName: 'Kenny',
        secondName: 'Kenny McCormick',
        status: 'poor and stupid'
      },
    }
    component.ngOnInit();
    fixture.detectChanges();

    const comparisonDetails = fixture.debugElement.query(By.css('table[data-block="one-row-details"]'));
    expect(comparisonDetails).toBeTruthy();
  });

  it('should highlight changed field of updated row', () => {
    component.log = {
      Table: 'south_park_table',
      User: 'eric@cartman.ass',
      Action: 'updated row',
      Date: '06/26/2021 7:22 PM',
      Status: LogStatus.Successfully,
      operationType: LogAction.Update,
      createdAt: '2021-06-26T07:22:00.603Z',
      prevValue: {
        firstName: 'Kenny',
        secondName: 'McCormick',
        status: 'poor'
      },
      currentValue: {
        firstName: 'Kenny',
        secondName: 'McCormick',
        status: 'poor and stupid'
      },
    }
    component.ngOnInit();
    fixture.detectChanges();

    const changedField = fixture.debugElement.query(By.css('.changed[data-line="status-field"]'));
    const unchangedField1 = fixture.debugElement.query(By.css('.changed[data-line="firstName-field"]'));
    const unchangedField2 = fixture.debugElement.query(By.css('.changed[data-line="secondName-field"]'));
    expect(changedField).toBeTruthy();
    expect(unchangedField1).toBeNull();
    expect(unchangedField2).toBeNull();
  });
});
