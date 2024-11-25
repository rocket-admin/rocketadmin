import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MongodbCredentialsFormComponent } from './mongodb-credentials-form.component';

describe('MongodbCredentialsFormComponent', () => {
  let component: MongodbCredentialsFormComponent;
  let fixture: ComponentFixture<MongodbCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MongodbCredentialsFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MongodbCredentialsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
