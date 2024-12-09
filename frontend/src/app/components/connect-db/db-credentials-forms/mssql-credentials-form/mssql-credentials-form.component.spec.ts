import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MssqlCredentialsFormComponent } from './mssql-credentials-form.component';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

describe('MssqlCredentialsFormComponent', () => {
  let component: MssqlCredentialsFormComponent;
  let fixture: ComponentFixture<MssqlCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MssqlCredentialsFormComponent],
      imports: [
        FormsModule,
        MatCheckboxModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MssqlCredentialsFormComponent);
    component = fixture.componentInstance;

    component.connection = {
      id: "12345678"
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
