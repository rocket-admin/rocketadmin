import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OracledbCredentialsFormComponent } from './oracledb-credentials-form.component';

describe('OracledbCredentialsFormComponent', () => {
  let component: OracledbCredentialsFormComponent;
  let fixture: ComponentFixture<OracledbCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OracledbCredentialsFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OracledbCredentialsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
