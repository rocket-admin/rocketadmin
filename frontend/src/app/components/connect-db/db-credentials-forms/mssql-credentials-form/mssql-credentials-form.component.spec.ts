import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MssqlCredentialsFormComponent } from './mssql-credentials-form.component';

describe('MssqlCredentialsFormComponent', () => {
  let component: MssqlCredentialsFormComponent;
  let fixture: ComponentFixture<MssqlCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MssqlCredentialsFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MssqlCredentialsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
