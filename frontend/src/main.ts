import * as Sentry from "@sentry/angular";

import { enableProdMode, isDevMode } from '@angular/core';

import { AppModule } from './app/app.module';
import { Integrations } from "@sentry/tracing";
import { environment } from './environments/environment';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import 'codemirror/mode/javascript/javascript';

if (environment.production) {
  enableProdMode();
}

if ((environment as any).saas) {
  Sentry.init({
    dsn: "https://c1a66b79dbed442bb8a8598eaa8608f5@o64941.ingest.sentry.io/5624913",
    integrations: [
      new Integrations.BrowserTracing({
        tracingOrigins: ["localhost", "https://api.autoadmin.org"],
        routingInstrumentation: Sentry.routingInstrumentation,
      }),
    ],

    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 1.0,
  });
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
