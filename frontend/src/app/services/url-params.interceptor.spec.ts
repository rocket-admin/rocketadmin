import { TestBed } from '@angular/core/testing';

import { EncodeUrlParamsSafelyInterceptor } from './url-params.interceptor';

describe('ServicesInterceptor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      EncodeUrlParamsSafelyInterceptor
      ]
  }));

  it('should be created', () => {
    const interceptor: EncodeUrlParamsSafelyInterceptor = TestBed.inject(EncodeUrlParamsSafelyInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
