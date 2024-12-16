import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Db2CredentialsFormComponent } from './db2-credentials-form.component';

describe('Db2CredentialsFormComponent', () => {
  let component: Db2CredentialsFormComponent;
  let fixture: ComponentFixture<Db2CredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Db2CredentialsFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Db2CredentialsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
