import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamodbCredentialsFormComponent } from './dynamodb-credentials-form.component';

describe('DynamodbCredentialsFormComponent', () => {
  let component: DynamodbCredentialsFormComponent;
  let fixture: ComponentFixture<DynamodbCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamodbCredentialsFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DynamodbCredentialsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
