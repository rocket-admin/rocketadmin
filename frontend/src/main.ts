import * as Sentry from "@sentry/angular";

import { enableProdMode, isDevMode } from '@angular/core';

import { AppModule } from './app/app.module';
import { Integrations } from "@sentry/tracing";
import { environment } from './environments/environment';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/php/php';
import 'codemirror/mode/ruby/ruby';
import 'codemirror/mode/go/go';
import 'codemirror/mode/python/python';

if (environment.production) {
  enableProdMode();
}

if ((environment as any).saas) {
  Sentry.init({
    dsn: "https://c1a66b79dbed442bb8a8598eaa8608f5@o64941.ingest.sentry.io/5624913",
    integrations: [
      new Integrations.BrowserTracing({
        tracingOrigins: ["localhost", "https://app.rocketadmin.com"],
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
