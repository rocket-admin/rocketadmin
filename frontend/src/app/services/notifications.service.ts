import { Alert, AlertAction, AlertType, ServerError } from '../models/alert';

import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  public alert: Alert;
  public idCounter = 0;

  constructor(
    private snackBar: MatSnackBar,
  ) { }

  showErrorSnackbar(message: string) {
    this.snackBar.open(message, 'Dismiss', {
      duration: 10000,
      horizontalPosition: 'left'
    });
  }

  showSuccessSnackbar(message: string) {
    this.snackBar.open(message, null, {
      duration: 2500,
      horizontalPosition: 'left'
    });
  }

  get currentAlert() {
    return this.alert;
  }

  showAlert(type: AlertType, message: ServerError | string, actions: AlertAction[]) {
    this.idCounter++;
    this.alert = {
      id: this.idCounter,
      type: type,
      message: message,
      actions: actions
    };
    // window.scrollTo(0, 0);
  }

  dismissAlert() {
    this.alert = null;
  }

  resetAlert() {
    this.alert = null;
  }
}
