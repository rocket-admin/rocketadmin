import { TestBed } from '@angular/core/testing';

import { CompanyService } from './company.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        // MatSnackBarModule
      ],
      // providers: [
      //   AuthService,
      //   {
      //     provide: NotificationsService,
      //     useValue: fakeNotifications
      //   }
      // ]
    });
    service = TestBed.inject(CompanyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
