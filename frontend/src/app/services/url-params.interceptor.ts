import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpParams,
  HttpParameterCodec
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class EncodeUrlParamsSafelyInterceptor implements HttpInterceptor, HttpParameterCodec {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const newParams = new HttpParams({
      fromString: req.params.toString(),
      encoder: this,
    });

    return next.handle(req.clone({
      params: newParams,
    }));
  }

  encodeKey(key: string): string {
    return encodeURIComponent(key);
  }

  encodeValue(value: string): string {
    return encodeURIComponent(value);
  }

  decodeKey(key: string): string {
    return decodeURIComponent(key);
  }

  decodeValue(value: string): string {
    return decodeURIComponent(value);
  }
}