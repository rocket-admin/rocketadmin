# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Project Overview

This is the frontend for Auto-Admin, a database administration tool built with Angular 19. The application provides a comprehensive interface for managing database connections, tables, and data with customizable widgets and user permissions.

## 🔧 Development Commands

### Build & Development
```bash
yarn start                    # Start development server (ng serve)
yarn build                    # Production build (ng build)
yarn build --configuration=development  # Development build
yarn build --configuration=saas         # SaaS build 
yarn build --configuration=saas-production  # SaaS production build
yarn build:stats             # Build with webpack bundle analyzer stats
yarn analyze                 # Analyze bundle size
```

### Testing
```bash
yarn test                     # Run tests in watch mode (ng test)
yarn test:ci                  # Run tests once for CI (--watch=false --browsers=ChromeHeadlessCustom)
yarn test --browsers=ChromeHeadlessCustom --no-watch --no-progress  # Run tests headlessly without watch
```

### Linting
```bash
yarn lint                     # Run TSLint (deprecated - needs ESLint migration)
ng lint                       # Alternative lint command
```

### Package Management
```bash
yarn add package-name         # Add dependency
yarn add -D package-name      # Add dev dependency  
yarn install                  # Install dependencies
```

## 🏗 Architecture Overview

### Core Technologies
- **Angular 19** with standalone components architecture
- **TypeScript 5.6** targeting ES2022
- **Angular Material 19** for UI components  
- **RxJS 7.4** for reactive programming
- **SCSS** with Material Design theming
- **Jasmine/Karma** for testing

### Key Architecture Patterns

#### Standalone Components
Uses Angular 19's standalone component architecture without NgModules:

```typescript
@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.css'],
  imports: [CommonModule, MatButtonModule, FormsModule], // Direct imports
})
export class ExampleComponent implements OnInit {
  // Component logic
}
```

#### Service-Based State Management
No NgRx - uses BehaviorSubject pattern for state management:

```typescript
@Injectable({ providedIn: 'root' })
export class DataService {
  private dataSubject = new BehaviorSubject<any>('');
  public cast = this.dataSubject.asObservable();
  
  updateData(newData: any) {
    this.dataSubject.next(newData);
  }
}
```

#### Multi-Environment Support
The app supports multiple deployment environments:
- `environment.ts` - Development
- `environment.prod.ts` - Production  
- `environment.saas.ts` - SaaS development
- `environment.saas-prod.ts` - SaaS production

Each environment uses different file replacements and build configurations.

### Project Structure

```
src/app/
├── components/
│   ├── dashboard/           # Main data interface
│   ├── ui-components/       # Reusable UI components
│   ├── login/               # Authentication
│   ├── registration/        # User registration
│   ├── connect-db/          # Database connection setup
│   ├── company/             # Company management
│   └── skeletons/           # Loading placeholders
├── services/                # Business logic & API calls
│   ├── auth.service.ts      # Authentication service
│   ├── connections.service.ts # Database connections
│   ├── tables.service.ts    # Table operations
│   └── user.service.ts      # User management
├── models/                  # TypeScript interfaces
├── consts/                  # Constants & configurations
│   ├── databases.ts         # Supported databases config
│   └── plans.ts            # Subscription plans
├── lib/                     # Utility functions
├── validators/              # Form validation
└── directives/              # Custom directives
```

### Database Support

The application supports multiple database types:
- MySQL
- PostgreSQL  
- MongoDB
- DynamoDB
- Cassandra
- OracleDB
- MSSQL
- IBM DB2

Database configurations are defined in `src/app/consts/databases.ts`.

### Authentication & User Management

- JWT token-based authentication with expiration handling
- Google OAuth integration
- Demo account functionality
- Session restoration on app initialization
- Automatic logout on token expiration

## 📝 Code Conventions

### Naming Conventions
- **Files**: `kebab-case.component.ts`
- **Classes**: `PascalCase` (e.g., `DbTableSettingsComponent`)
- **Methods**: `camelCase` with verb-noun pattern
- **Variables**: `camelCase` descriptive names
- **Constants**: `UPPER_SNAKE_CASE`
- **Private members**: Prefixed with `_` (e.g., `_privateMethod`)
- **Selectors**: `app-` prefix with kebab-case

### Import Organization
```typescript
// External libraries first
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

// Internal imports second  
import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { DataService } from 'src/app/services/data.service';
```

### Component Structure
```typescript
@Component({
  selector: 'app-widget-name',
  templateUrl: './widget-name.component.html',
  styleUrls: ['./widget-name.component.css'],
  imports: [CommonModule, MatModule, ...], // All required imports
})
export class WidgetNameComponent implements OnInit {
  // Input/Output properties first
  @Input() inputProperty: string;
  @Output() outputEvent = new EventEmitter<any>();
  
  // Public properties
  public publicProperty: string;
  
  // Private properties  
  private _privateProperty: string;
  
  // Lifecycle hooks
  ngOnInit(): void {
    // Initialization logic
  }
  
  // Public methods
  public handleClick(): void {
    // Event handling
  }
  
  // Private methods
  private _helperMethod(): void {
    // Internal logic
  }
}
```

## 🧪 Testing Configuration

### Test Framework
- **Jasmine** as testing framework
- **Karma** as test runner
- **ChromeHeadless** for CI environments

### Test Structure
```typescript
describe('ComponentName', () => {
  let component: ComponentName;
  let fixture: ComponentFixture<ComponentName>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentName, MaterialModules, ...],
      providers: [provideHttpClient(), MockServices, ...]
    }).compileComponents();
    
    fixture = TestBed.createComponent(ComponentName);
    component = fixture.componentInstance;
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### Karma Configuration
Custom launcher `ChromeHeadlessCustom` is configured for CI with flags `--no-sandbox --disable-gpu`.

## 🎨 Styling & Theming

### Material Design
- Uses Material Design 2 (M2) APIs
- Custom theme with light/dark mode support  
- SCSS preprocessing with Material theme presets
- Custom theme files: `src/custom-theme.scss`, `src/styles.scss`

### SCSS Structure
```scss
// Component-specific styles using BEM methodology
.component-name {
  &__element {
    // Element styles
  }
  
  &--modifier {
    // State variations
  }
}
```

## 📦 Third-Party Integrations

### Analytics & Monitoring
- **Angulartics2** with Amplitude integration
- **@sentry/angular-ivy** for error monitoring
- **Hotjar** for user behavior tracking (demo accounts)
- **Intercom** for customer support

### Payment Processing
- **@stripe/stripe-js** and **ngx-stripe** for payment processing

### Additional Libraries
- **@ngstack/code-editor** for code editing capabilities
- **ngx-markdown** for markdown rendering
- **libphonenumber-js** for phone number handling
- **date-fns** for date manipulation
- **lodash** for utility functions

## 🔧 Build Configuration

### Angular Build Targets
- **Default**: Development configuration
- **Production**: Optimized build with source maps
- **Development**: Explicit development configuration
- **SaaS/SaaS-Production**: Specialized SaaS builds with different index files

### Bundle Size Limits
- Initial bundle: Warning at 2MB, error at 5MB
- Component styles: Warning at 6KB, error at 10KB

## 🚨 Important Notes

### Migration Recommendations
- **TSLint → ESLint**: Current linting uses deprecated TSLint
- **Material Design 3**: Consider upgrading from M2 to M3 APIs  

### Performance Considerations
- Tree-shaking enabled in production builds
- Lazy loading for route-based features
- Memory leak prevention with proper subscription management using `takeUntil` pattern

### Security
- Token-based authentication with automatic expiration
- XSS protection through Angular's built-in sanitization
- Sentry integration for error monitoring and security alerts