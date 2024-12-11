import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OracledbCredentialsFormComponent } from './oracledb-credentials-form.component';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

describe('OracledbCredentialsFormComponent', () => {
  let component: OracledbCredentialsFormComponent;
  let fixture: ComponentFixture<OracledbCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OracledbCredentialsFormComponent],
      imports: [
        FormsModule,
        MatCheckboxModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OracledbCredentialsFormComponent);
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
