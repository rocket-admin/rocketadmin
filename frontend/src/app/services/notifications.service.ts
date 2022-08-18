import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Alert, AlertAction, AlertType } from '../models/alert';

let idCounter = 0;

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  public alert: Alert;

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

  showAlert(type: AlertType, message: string, actions: AlertAction[]) {
    idCounter++;
    this.alert = {
      id: idCounter,
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
