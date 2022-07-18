import { BehaviorSubject, Observable, of, ReplaySubject } from 'rxjs';
import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fromFetch } from 'rxjs/fetch';
import { switchMap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  private config$ = new ReplaySubject<any | null>(null);
  private loadedConfig = false;

  constructor(
    @Inject('CONFIG_URL')
    private configUrl: string) {
      this.getConfig();
    }

    getConfig(): Observable<any> {
      if (!this.loadedConfig) {
        this.loadedConfig = true;
        fromFetch(this.configUrl).pipe(
          switchMap(response => {
            if (response.ok) {
              // OK return data
              return response.json();
            } else {
              // Server is returning a status requiring the client to try something else.
              return of({ error: true, message: `Error ${ response.status }` });
            }
          }),
          catchError(err => {
            // Network or other error, handle appropriately
            console.error(err);
            return of({ error: true, message: err.message })
          })
        ).subscribe(this.config$);
      }
      return this.config$;
    }
}
