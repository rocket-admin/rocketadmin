import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { NotificationsService } from './notifications.service';
import { TestBed } from '@angular/core/testing';
import { Banner, BannerActionType, BannerType } from '../models/banner';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let snackBar: MatSnackBar;

  const banner: Banner = {
    id: 0,
    type: BannerType.Error,
    message: 'Error message',
    actions: [
      {
        type: BannerActionType.Button,
        caption: 'Dismiss'
      }
    ]
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ MatSnackBarModule ],
    })

    service = TestBed.get(NotificationsService);
    snackBar = TestBed.get(MatSnackBar);
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

  it('should get banner', () => {
    service.banner = banner;
    expect(service.currentBanner).toEqual(banner);
  })

  it('should show new banner', () => {
    service.banner = banner;
    service.showBanner(BannerType.Error, 'Error message 2', [
      {
        type: BannerActionType.Button,
        caption: 'Dissmis'
      }
    ]);

    expect(service.banner).toEqual({
      id: 1,
      type: BannerType.Error,
      message: 'Error message 2',
      actions: [
        {
          type: BannerActionType.Button,
          caption: 'Dissmis'
        }
      ]
    })
  });

  it('should dissmis banner', () => {
    service.banner = banner;
    service.dismissBanner();

    expect(service.banner).toBeNull();
  }),

  it('should reset banner', () => {
    service.banner = banner;
    service.resetBanner();

    expect(service.banner).toBeNull();
  })
});
