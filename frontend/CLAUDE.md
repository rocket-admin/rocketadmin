# Auto-Admin Frontend Development Guide

## 🚀 Project Overview

This is the frontend for Auto-Admin, a database administration tool built with Angular 19. The application provides a comprehensive interface for managing database connections, tables, and data with customizable widgets and user permissions.

## 🛠 Technologies & Frameworks

### Core Technologies
- **Angular**: v19.0.4 (Latest with standalone components)
- **TypeScript**: v5.6.0 (ES2022 target)
- **RxJS**: v7.4.0 (Reactive programming)
- **Node.js**: Modern versions supported

### UI/UX Stack
- **Angular Material**: v19.0.3 (Primary UI library)
- **Angular CDK**: v19.0.3 (Component Development Kit)
- **@brumeilde/ngx-theme**: v1.2.1 (Custom theming)
- **SCSS**: Material Design theming
- **ngx-bootstrap**: v19.0.2 (Additional components)

### Additional Libraries
- **@ngstack/code-editor**: v9.0.0 (Code editing)
- **ngx-markdown**: v19.0.0 (Markdown rendering)
- **ngx-stripe**: v19.0.0 (Payment integration)
- **angulartics2**: v14.1.0 (Analytics)
- **@sentry/angular-ivy**: v7.116.0 (Error monitoring)

## 📁 Project Structure

```
src/app/
├── components/
│   ├── dashboard/           # Main data interface
│   ├── ui-components/       # Reusable UI components
│   │   ├── row-fields/      # Widget components (text, date, select, etc.)
│   │   ├── filter-fields/   # Filter components
│   │   └── alert/           # Common UI elements
│   ├── login/               # Authentication
│   ├── registration/        # User registration
│   ├── connect-db/          # Database connection setup
│   ├── company/             # Company management
│   └── skeletons/           # Loading placeholders
├── services/                # Business logic & API calls
├── models/                  # TypeScript interfaces
├── consts/                  # Constants & configurations
├── lib/                     # Utility functions
├── validators/              # Form validation
└── directives/              # Custom directives
```

## 🏗 Architecture Patterns

### Standalone Components
Uses Angular 19's standalone component architecture:

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

### Service-Based State Management
No NgRx - uses BehaviorSubject pattern for state:

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

### Dynamic Widget System
Highly flexible widget system for different data types:

```typescript
export const UIwidgets = {
  String: TextRowComponent,
  Number: NumberRowComponent,
  Date: DateRowComponent,
  Boolean: BooleanRowComponent,
  Phone: PhoneRowComponent,
  // ... more widgets
};
```

## 📝 Code Style & Conventions

### Naming Conventions
- **Files**: `kebab-case.component.ts`
- **Classes**: `PascalCase` (e.g., `DbTableSettingsComponent`)
- **Methods**: `camelCase` with verb-noun pattern
- **Variables**: `camelCase` descriptive names
- **Constants**: `UPPER_SNAKE_CASE`
- **Private members**: Prefixed with `_` (e.g., `_privateMethod`)
- **Selectors**: `app-` prefix with kebab-case

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

## 🎨 Styling Guidelines

### Material Design Implementation
- Uses Material Design 2 (M2) APIs
- Custom theme with light/dark mode support
- Noto Sans font family

### SCSS Structure
```scss
// Component-specific styles
.component-name {
  &__element {
    // BEM methodology
  }
  
  &--modifier {
    // State variations
  }
}

// Use Material Design spacing
.mat-form-field {
  width: 100%;
  margin-bottom: 16px;
}
```

### Theme Configuration
```scss
$custom-palette-primary: mat.m2-define-palette(mat.$m2-blue-palette);
$custom-light-theme: mat.m2-define-light-theme((
  color: (
    primary: $custom-palette-primary,
    accent: $custom-palette-accent,
    warn: $custom-palette-warn,
  ),
  density: -3,
));
```

## 🧪 Testing Guidelines

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
  
  it('should handle user input', () => {
    // Test user interactions
  });
});
```

### Test Commands
```bash
npm test          # Run tests in watch mode
npm run test:ci   # Run tests once for CI
```

## 🔧 Development Workflow

### Development Commands
```bash
npm start         # Start development server
npm run build     # Build for production
npm test          # Run tests
npm run lint      # Run linting (TSLint - needs ESLint migration)
```

### Environment Configuration
- `environment.ts` - Development
- `environment.prod.ts` - Production
- `environment.saas.ts` - SaaS development
- `environment.saas-prod.ts` - SaaS production

## 🎯 Widget Development Guide

### Creating New Widgets

1. **Create Component Files**:
```bash
mkdir src/app/components/ui-components/row-fields/your-widget
```

2. **Extend Base Component**:
```typescript
export class YourWidgetComponent extends BaseRowFieldComponent {
  @Input() value: any;
  static type = 'your-widget';
  
  // Widget-specific logic
}
```

3. **Add to Widget Registry**:
```typescript
// In src/app/consts/field-types.ts
export const UIwidgets = {
  // ... existing widgets
  YourWidget: YourWidgetComponent,
};
```

4. **Add to Enums**:
```typescript
// Backend: src/enums/widget-type.enum.ts
// Shared: shared-code/src/data-access-layer/shared/enums/table-widget-type.enum.ts
export enum WidgetTypeEnum {
  // ... existing types
  YourWidget = 'YourWidget',
}
```

5. **Configure Default Parameters**:
```typescript
// In db-table-widgets.component.ts
public defaultParams = {
  // ... existing params
  YourWidget: `// Widget configuration documentation
{
  "param1": "value1",
  "param2": true
}`,
};
```

## 🚨 Common Patterns & Best Practices

### Error Handling
```typescript
this.service.getData().subscribe({
  next: (data) => {
    // Handle success
  },
  error: (error) => {
    console.error('Error occurred:', error);
    // Show user-friendly error message
  }
});
```

### Loading States
```typescript
export class ExampleComponent {
  public loading = false;
  
  async loadData() {
    this.loading = true;
    try {
      const data = await this.service.getData().toPromise();
      // Process data
    } finally {
      this.loading = false;
    }
  }
}
```

### Form Validation
```typescript
// Use Angular's reactive forms with Material Design
import { FormBuilder, Validators } from '@angular/forms';

constructor(private fb: FormBuilder) {
  this.form = this.fb.group({
    field: ['', [Validators.required, Validators.minLength(3)]]
  });
}
```

## 📦 Package Management

### Using Yarn
```bash
yarn add package-name          # Add dependency
yarn add -D package-name       # Add dev dependency  
yarn install                   # Install dependencies
```

### Important: Peer Dependencies
When adding new packages, check for peer dependency warnings and install missing dependencies:
```bash
yarn add ngx-intl-tel-input intl-tel-input google-libphonenumber
```

## 🔄 Migration Notes

### Recommended Upgrades
- **TSLint → ESLint**: Current linting setup uses deprecated TSLint
- **Material Design 3**: Consider upgrading from M2 to M3 APIs
- **Standalone Migration**: Already using standalone components (✅)

### Breaking Changes to Watch
- Angular Material API changes between versions
- RxJS operator deprecations
- TypeScript strict mode compliance

## 🎯 Performance Considerations

### Bundle Optimization
- Tree-shaking enabled in production builds
- Lazy loading for route-based features
- OnPush change detection where applicable

### Memory Management
```typescript
export class ExampleComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  
  ngOnInit() {
    this.service.data$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      // Handle data
    });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## 🤝 Contributing

When contributing to this project:

1. Follow the established naming conventions
2. Extend `BaseRowFieldComponent` for new widgets
3. Add comprehensive tests for new features
4. Update this CLAUDE.md file when adding new patterns
5. Ensure builds pass with `npm run build`
6. Follow the widget development guide for UI components

For questions about implementation patterns, refer to existing similar components in the codebase as examples.