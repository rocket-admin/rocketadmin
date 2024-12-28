import { ConfigurationService } from './configuration.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { TokenInterceptor } from './token.interceptor';
import { provideHttpClient } from '@angular/common/http';

describe('TokenInterceptor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [
      RouterTestingModule.withRoutes([]),
      MatSnackBarModule,
      MatDialogModule
    ],
    providers: [
      provideHttpClient(),
      TokenInterceptor,
      {
        provide: ConfigurationService,
        useValue: { CONFIG_URL: 'https://app.rocketadmin.com/api' }
      }
    ]
  }));

  it('should be created', () => {
    const interceptor: TokenInterceptor = TestBed.inject(TokenInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
