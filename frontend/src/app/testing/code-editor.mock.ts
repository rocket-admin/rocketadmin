import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Mock component for ngs-code-editor from @ngstack/code-editor.
 *
 * Usage in tests:
 * ```typescript
 * import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
 * import { CodeEditorModule } from '@ngstack/code-editor';
 * import { NO_ERRORS_SCHEMA } from '@angular/core';
 *
 * await TestBed.configureTestingModule({
 *   imports: [YourComponent, BrowserAnimationsModule],
 * })
 * .overrideComponent(YourComponent, {
 *   remove: { imports: [CodeEditorModule] },
 *   add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] }
 * })
 * .compileComponents();
 * ```
 */
@Component({
	selector: 'ngs-code-editor',
	template: '<div class="mock-code-editor"></div>',
	standalone: true,
})
export class MockCodeEditorComponent {
	@Input() theme: string = 'vs';
	@Input() codeModel: any;
	@Input() options: any;
	@Input() readOnly: boolean = false;
	@Output() valueChanged = new EventEmitter<string>();
}
