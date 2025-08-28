import * as Sentry from "@sentry/angular-ivy";

import { APP_INITIALIZER, ErrorHandler, enableProdMode, importProvidersFrom } from '@angular/core';
import { BrowserModule, Title, bootstrapApplication } from "@angular/platform-browser";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { IColorConfig, NgxThemeModule } from "@brumeilde/ngx-theme";
import { MarkdownModule, provideMarkdown } from "ngx-markdown";
import { Router, RouterModule } from "@angular/router";

import { Angulartics2Module } from "angulartics2";
import { AppComponent } from "./app/app.component";
import { AppRoutingModule } from "./app/app-routing.module";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { CodeEditorModule } from "@ngstack/code-editor";
import { ConfigModule } from "./app/modules/config.module";
import { ConnectionsService } from "./app/services/connections.service";
import { CookieService } from "ngx-cookie-service";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { DynamicModule } from "ng-dynamic-component";
import { EncodeUrlParamsSafelyInterceptor } from "./app/services/url-params.interceptor";
import { NgxStripeModule } from "ngx-stripe";
import { NotificationsService } from "./app/services/notifications.service";
import { PasswordStrengthMeterComponent } from "angular-password-strength-meter";
import { TablesService } from "./app/services/tables.service";
import { TokenInterceptor } from "./app/services/token.interceptor";
import { UsersService } from "./app/services/users.service";
import { environment } from './environments/environment';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideZxvbnServiceForPSM } from "angular-password-strength-meter/zxcvbn";

const saasExtraProviders = (environment as any).saas ? [
  {
    provide: Sentry.TraceService,
    deps: [Router],
  },
  {
    provide: ErrorHandler,
    useValue: Sentry.createErrorHandler({
      showDialog: true,
    }),
  },
] : [];
const colorConfig: IColorConfig<Palettes, Colors> = {
  palettes: { primaryPalette: '#212121', accentedPalette: '#C177FC', warnPalette: '#B71C1C', whitePalette: '#FFFFFF', warnDarkPalette: '#E53935' },
  simpleColors: { myColorName: '#2e959a' },
};
type Palettes = { primaryPalette: string, accentedPalette: string, warnPalette: string, whitePalette: string, warnDarkPalette: string };
type Colors = { myColorName: string };

const stripeKey = location.host === environment.stagingHost ? 'pk_test_51JM8FBFtHdda1TsBTjVNBFMIAA8cXLNWTmZCF22FCS5swdJIFqMk82ZEeZpvTys7oxlDekdcYIGaQ5MEFz6lWa2s000r6RziCg' : 'pk_live_51JM8FBFtHdda1TsBR7nieMFVFigZAUXbPhQTNvaSyLynIW1lbfzO6rfqqIUn0JAGJRq9mrwKwrVCsDDFOs84M7pE006xDqNgHk'


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

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, AppRoutingModule, FormsModule, ReactiveFormsModule, RouterModule, DynamicModule, Angulartics2Module.forRoot(), ClipboardModule, DragDropModule, MarkdownModule.forRoot(), CodeEditorModule.forRoot(),
        // ...saasExtraModules,
        NgxThemeModule.forRoot(colorConfig, {
            frameworks: ['material'], // optional, default : ['tailwind', 'material']
        }), NgxStripeModule.forRoot(stripeKey), ConfigModule.buildForConfigUrl('/config.json')),
        PasswordStrengthMeterComponent,
        ConnectionsService,
        UsersService,
        NotificationsService,
        TablesService,
        CookieService,
        provideMarkdown(),
        Title,
        provideZxvbnServiceForPSM(),
        {
            provide: HTTP_INTERCEPTORS,
            useClass: TokenInterceptor,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: EncodeUrlParamsSafelyInterceptor,
            multi: true
        },
        {
            provide: APP_INITIALIZER,
            useFactory: () => () => { },
            deps: (environment as any).saas ? [Sentry.TraceService] : [],
            multi: true,
        },
        {
            provide: 'COLOR_CONFIG',
            useValue: colorConfig
        },
        {
            provide: 'THEME_OPTIONS',
            useValue: { frameworks: ['material'] }
        },
        ...saasExtraProviders,
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimations()
    ]
})
  .catch(err => console.error(err));
