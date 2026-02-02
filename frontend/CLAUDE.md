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
- **Angular 20** with standalone components architecture
- **TypeScript 5.6** targeting ES2022
- **Angular Signals** for reactive state management
- **Angular Material 19** for UI components
- **RxJS 7.4** for reactive programming (HTTP calls, complex streams)
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

#### Signal-Based State Management (Required for New Code)
All new code must use Angular signals for state management. Use `rxResource` for data fetching:

```typescript
@Injectable({ providedIn: 'root' })
export class DataService {
  private _http = inject(HttpClient);

  // Reactive parameter for data fetching
  private _activeId = signal<string | null>(null);

  // Use rxResource for reactive data fetching
  private _dataResource = rxResource({
    params: () => this._activeId(),
    stream: ({ params: id }) => {
      if (!id) return EMPTY;
      return this._http.get<Data[]>(`/api/data/${id}`);
    },
  });

  // Expose as readonly signals
  public readonly data = computed(() => this._dataResource.value() ?? []);
  public readonly loading = computed(() => this._dataResource.isLoading());

  setActiveId(id: string): void {
    this._activeId.set(id);
  }

  refresh(): void {
    this._dataResource.reload();
  }
}
```

**Legacy pattern** (BehaviorSubject - avoid in new code):
```typescript
// Old pattern - do not use for new code
private dataSubject = new BehaviorSubject<any>('');
public cast = this.dataSubject.asObservable();
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

### Template Syntax
- **Use built-in control flow** (`@if`, `@for`, `@switch`) instead of structural directives (`*ngIf`, `*ngFor`, `*ngSwitch`) in all new code
- Example: `@if (condition) { ... }` instead of `<div *ngIf="condition">...</div>`
- Example: `@for (item of items; track item.id) { ... }` instead of `<div *ngFor="let item of items">...</div>`

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

### Component Structure (Signal-Based)
```typescript
@Component({
  selector: 'app-widget-name',
  templateUrl: './widget-name.component.html',
  styleUrls: ['./widget-name.component.css'],
  imports: [CommonModule, MatModule, ...], // All required imports
})
export class WidgetNameComponent implements OnInit {
  // Dependency injection
  private _dataService = inject(DataService);

  // Signals for component state (required for new code)
  protected loading = signal(false);
  protected items = signal<Item[]>([]);
  protected searchQuery = signal('');

  // Computed signals for derived state
  protected filteredItems = computed(() => {
    const items = this.items();
    const query = this.searchQuery().toLowerCase();
    return query ? items.filter(i => i.name.toLowerCase().includes(query)) : items;
  });

  // Effects for side effects
  constructor() {
    effect(() => {
      const query = this.searchQuery();
      // React to signal changes
    });
  }

  // Lifecycle hooks
  ngOnInit(): void {
    // Initialization logic
  }

  // Public methods
  handleClick(): void {
    this.loading.set(true);
    // Event handling
  }

  // Private methods at the end
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
// Define testable type for accessing protected signals (avoid `as any`)
type ComponentNameTestable = ComponentName & {
  loading: Signal<boolean>;
  items: WritableSignal<Item[]>;
  searchQuery: WritableSignal<string>;
};

describe('ComponentName', () => {
  let component: ComponentName;
  let fixture: ComponentFixture<ComponentName>;
  let mockDataService: Partial<DataService>;

  beforeEach(async () => {
    // Use Partial<ServiceType> instead of `any` for mocks
    mockDataService = {
      data: signal([]).asReadonly(),
      loading: signal(false).asReadonly(),
      setActiveId: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ComponentName, MaterialModules, ...],
      providers: [
        provideHttpClient(),
        { provide: DataService, useValue: mockDataService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentName);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should access protected signals with proper typing', () => {
    const testable = component as ComponentNameTestable;
    testable.searchQuery.set('test');
    expect(testable.loading()).toBe(false);
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
- **@sentry/angular** for error monitoring
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

### Signals Requirement
**All new code must use Angular signals** for state management:
- Use `signal()` for component state instead of plain properties
- Use `computed()` for derived state
- Use `effect()` for side effects
- Use `rxResource()` in services for data fetching
- Avoid BehaviorSubject in new code
- Never use `as any` in tests - use `Partial<ServiceType>` and testable type aliases

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