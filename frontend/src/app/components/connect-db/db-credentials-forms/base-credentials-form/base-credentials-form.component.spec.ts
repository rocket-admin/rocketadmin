import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseCredentialsFormComponent } from './base-credentials-form.component';

describe('BaseCredentialsFormComponent', () => {
  let component: BaseCredentialsFormComponent;
  let fixture: ComponentFixture<BaseCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseCredentialsFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseCredentialsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
