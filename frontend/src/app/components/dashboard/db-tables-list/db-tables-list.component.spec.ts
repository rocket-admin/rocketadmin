import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Angulartics2Module } from 'angulartics2';
import { DbTablesListComponent } from './db-tables-list.component';
import { provideHttpClient } from '@angular/common/http';

describe('DbTablesListComponent', () => {
  let component: DbTablesListComponent;
  let fixture: ComponentFixture<DbTablesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient()],
      imports: [
        Angulartics2Module.forRoot(),
        DbTablesListComponent
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DbTablesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
