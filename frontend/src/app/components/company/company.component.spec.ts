import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyComponent } from './company.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { Angulartics2Module } from 'angulartics2';

describe('CompanyComponent', () => {
  let component: CompanyComponent;
  let fixture: ComponentFixture<CompanyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompanyComponent ],
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        MatDialogModule,
        Angulartics2Module.forRoot()
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
