import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { NotificationsService } from './notifications.service';
import { TestBed } from '@angular/core/testing';
import { Alert, AlertActionType, AlertType } from '../models/alert';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let snackBar: MatSnackBar;

  const alert: Alert = {
    id: 0,
    type: AlertType.Error,
    message: 'Error message',
    actions: [
      {
        type: AlertActionType.Button,
        caption: 'Dismiss'
      }
    ]
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ MatSnackBarModule ],
    })

    service = TestBed.inject(NotificationsService);
    snackBar = TestBed.inject(MatSnackBar);
    service.idCounter = 0;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show ErrorSnackbar', () => {
    const fakeSnackBar = spyOn(snackBar, 'open');
    service.showErrorSnackbar('Error message.')
    expect(fakeSnackBar).toHaveBeenCalledOnceWith(
      'Error message.',
      'Dismiss',
      Object({
        duration: 10000,
        horizontalPosition: 'left'
      })
    );
  });

  it('should show SuccessSnackbar', () => {
    const fakeSnackBar = spyOn(snackBar, 'open');
    service.showSuccessSnackbar('Success message.')
    expect(fakeSnackBar).toHaveBeenCalledOnceWith(
      'Success message.',
      null,
      Object({
        duration: 2500,
      horizontalPosition: 'left'
      })
    );
  });

  it('should get alert', () => {
    service.alert = alert;
    expect(service.currentAlert).toEqual(alert);
  })

  it('should show new alert', () => {
    service.alert = alert;
    service.showAlert(AlertType.Error, 'Error message 2', [
      {
        type: AlertActionType.Button,
        caption: 'Dissmis'
      }
    ]);

    expect(service.alert).toEqual({
      id: 1,
      type: AlertType.Error,
      message: 'Error message 2',
      actions: [
        {
          type: AlertActionType.Button,
          caption: 'Dissmis'
        }
      ]
    })
  });

  it('should dissmis alert', () => {
    service.alert = alert;
    service.dismissAlert();

    expect(service.alert).toBeNull();
  }),

  it('should reset alert', () => {
    service.alert = alert;
    service.resetAlert();

    expect(service.alert).toBeNull();
  })
});
