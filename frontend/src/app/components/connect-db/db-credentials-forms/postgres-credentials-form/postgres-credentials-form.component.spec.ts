import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostgresCredentialsFormComponent } from './postgres-credentials-form.component';

describe('PostgresCredentialsFormComponent', () => {
  let component: PostgresCredentialsFormComponent;
  let fixture: ComponentFixture<PostgresCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostgresCredentialsFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PostgresCredentialsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
