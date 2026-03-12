import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JsonEditorDisplayComponent } from './json-editor.component';

describe('JsonEditorDisplayComponent', () => {
	let component: JsonEditorDisplayComponent;
	let fixture: ComponentFixture<JsonEditorDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [JsonEditorDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(JsonEditorDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should format JSON value', () => {
		fixture.componentRef.setInput('value', '{"name":"test","count":3}');
		expect(component.formattedJson).toBe(JSON.stringify({ name: 'test', count: 3 }, null, 2));
	});

	it('should handle invalid JSON', () => {
		fixture.componentRef.setInput('value', 'not valid json');
		expect(component.formattedJson).toBe('not valid json');
	});
});
