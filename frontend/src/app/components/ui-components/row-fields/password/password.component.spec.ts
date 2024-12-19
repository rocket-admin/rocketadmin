import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordRowComponent } from './password.component';

describe('PasswordRowComponent', () => {
  let component: PasswordRowComponent;
  let fixture: ComponentFixture<PasswordRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PasswordRowComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should send onChange event with new null value if user clear password', () => {
    component.clearPassword = true;
    const event = spyOn(component.onFieldChange, 'emit');
    component.onClearPasswordChange();
    expect(event).toHaveBeenCalledWith(null);
  });
});
