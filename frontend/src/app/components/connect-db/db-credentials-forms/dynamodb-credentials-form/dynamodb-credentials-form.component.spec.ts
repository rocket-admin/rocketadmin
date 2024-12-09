import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamodbCredentialsFormComponent } from './dynamodb-credentials-form.component';
import { FormsModule } from '@angular/forms';

describe('DynamodbCredentialsFormComponent', () => {
  let component: DynamodbCredentialsFormComponent;
  let fixture: ComponentFixture<DynamodbCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DynamodbCredentialsFormComponent],
      imports: [
        FormsModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamodbCredentialsFormComponent);
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
