import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BooleanFilterComponent } from './boolean.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

describe('BooleanFilterComponent', () => {
  let component: BooleanFilterComponent;
  let fixture: ComponentFixture<BooleanFilterComponent>;

  const fakeStructure = {
    "column_name": "banned",
    "column_default": "0",
    "data_type": "tinyint",
    "isExcluded": false,
    "isSearched": false,
    "auto_increment": false,
    "allow_null": false,
    "character_maximum_length": 1
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule,
        MatDialogModule,
        BooleanFilterComponent,
        BrowserAnimationsModule
      ],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BooleanFilterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set booleanValue in false when input value is 0', () => {
    component.value = 0;
    component.structure = fakeStructure;
    component.ngOnInit();

    expect(component.booleanValue).toEqual(false);
  });

  it('should set booleanValue in unknown when input value is null', () => {
    component.value = null;
    component.structure = fakeStructure;
    component.ngOnInit();

    expect(component.booleanValue).toEqual('unknown');
  });

  it('should set isRadiogroup in false if allow_null is false', () => {
    component.value = undefined;
    component.structure = fakeStructure;
    component.ngOnInit();

    expect(component.isRadiogroup).toEqual(false);
  })

  it('should set isRadiogroup in true if allow_null is true', () => {
    component.value = undefined;
    component.structure = {
      "column_name": "banned",
      "column_default": "0",
      "data_type": "tinyint",
      "isExcluded": false,
      "isSearched": false,
      "auto_increment": false,
      "allow_null": true,
      "character_maximum_length": 1
    };
    component.ngOnInit();

    expect(component.isRadiogroup).toEqual(true);
  })
});
