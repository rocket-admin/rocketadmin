import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Banner, BannerAction, BannerType } from '../models/banner';

let idCounter = 0;

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  public banner: Banner;

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

  get currentBanner() {
    return this.banner;
  }

  showBanner(type: BannerType, message: string, actions: BannerAction[]) {
    idCounter++;
    this.banner = {
      id: idCounter,
      type: type,
      message: message,
      actions: actions
    };
    // window.scrollTo(0, 0);
  }

  dismissBanner() {
    this.banner = null;
  }

  resetBanner() {
    this.banner = null;
  }
}
