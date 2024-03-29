import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { BooleanFilterComponent } from './boolean.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

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

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BooleanFilterComponent ],
      imports: [ HttpClientTestingModule ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BooleanFilterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set value in true when input value contain anything', () => {
    component.value = 'anything';
    component.structure = fakeStructure;
    component.ngOnInit();

    expect(component.value).toEqual(true);
  });

  it('should set value in felse when input value is 0', () => {
    component.value = 0;
    component.structure = fakeStructure;
    component.ngOnInit();

    expect(component.value).toEqual(false);
  });

  it('should set value in null when input value is undefined', () => {
    component.value = undefined;
    component.structure = fakeStructure;
    component.ngOnInit();

    expect(component.value).toEqual(null);
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
