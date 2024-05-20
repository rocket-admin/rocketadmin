import * as Sentry from "@sentry/angular-ivy";

import { enableProdMode } from '@angular/core';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { php } from '@codemirror/lang-php';
import { go } from '@codemirror/lang-go';
import { python } from '@codemirror/lang-python';

javascript();
cpp();
php();
go();
python();

if (environment.production) {
  enableProdMode();
}

if ((environment as any).saas) {
  Sentry.init({
    dsn: "https://4d774c4c2c8a8f733cb4d43599cc0dc6@o4506084700389376.ingest.sentry.io/4506084702486528",
    integrations: [
      new Sentry.BrowserTracing({
        // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
        tracePropagationTargets: ["localhost", /^https:\/\/app\.rocketadmin\.com\/api/],
        routingInstrumentation: Sentry.routingInstrumentation,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  });
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
