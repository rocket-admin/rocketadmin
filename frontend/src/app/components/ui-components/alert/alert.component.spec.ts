import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertComponent } from './alert.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AlertType, AlertActionType } from 'src/app/models/alert';

describe('AlertComponent', () => {
  let component: AlertComponent;
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule
      ],
      declarations: [ AlertComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call finction from action on alert button click', () => {
    const buttonAction = jasmine.createSpy();
    const alert = {
      id: 0,
      type: AlertType.Error,
      message: 'Error message',
      actions: [
        {
          type: AlertActionType.Button,
          caption: 'Dissmis',
          action: buttonAction
        }
      ]
    }
    component.onButtonClick(alert, alert.actions[0]);
    expect(buttonAction).toHaveBeenCalled();
  })
});
