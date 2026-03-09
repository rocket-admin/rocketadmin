import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CodeDisplayComponent } from './code.component';

describe('CodeDisplayComponent', () => {
	let component: CodeDisplayComponent;
	let fixture: ComponentFixture<CodeDisplayComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CodeDisplayComponent],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CodeDisplayComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should display value', () => {
		fixture.componentRef.setInput('value', 'console.log("hello")');
		expect(component.value()).toBe('console.log("hello")');
	});

	it('should display dash for null', () => {
		fixture.componentRef.setInput('value', null);
		expect(component.value()).toBeNull();
	});
});
