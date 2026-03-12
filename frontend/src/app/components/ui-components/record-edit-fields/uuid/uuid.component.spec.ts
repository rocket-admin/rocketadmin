import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { validate as uuidValidate } from 'uuid';
import { UuidEditComponent } from './uuid.component';

describe('UuidEditComponent', () => {
	let component: UuidEditComponent;
	let fixture: ComponentFixture<UuidEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [UuidEditComponent, BrowserAnimationsModule],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(UuidEditComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should be in create mode when value is empty', () => {
		fixture.componentRef.setInput('value', '');
		component.ngOnInit();
		expect(component.isCreateMode).toBe(true);
	});

	it('should be in update mode when value is set', () => {
		fixture.componentRef.setInput('value', '550e8400-e29b-41d4-a716-446655440000');
		component.ngOnInit();
		expect(component.isCreateMode).toBe(false);
	});

	it('should generate a UUID on create mode', () => {
		fixture.componentRef.setInput('value', '');
		component.ngOnInit();
		expect(component.value()).toBeTruthy();
		expect(uuidValidate(component.value())).toBe(true);
	});

	it('should not overwrite existing value on init', () => {
		const existingUuid = '550e8400-e29b-41d4-a716-446655440000';
		fixture.componentRef.setInput('value', existingUuid);
		component.ngOnInit();
		expect(component.value()).toBe(existingUuid);
	});

	it('should default to v4 UUID version', () => {
		expect(component.uuidVersion).toBe('v4');
	});

	it('should parse widget params for version', () => {
		fixture.componentRef.setInput('value', '');
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: { version: 'v1' },
		} as any);
		component.ngOnInit();
		expect(component.uuidVersion).toBe('v1');
	});

	it('should parse widget params for namespace and name', () => {
		fixture.componentRef.setInput('value', '');
		fixture.componentRef.setInput('widgetStructure', {
			widget_params: {
				version: 'v5',
				namespace: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
				name: 'test',
			},
		} as any);
		component.ngOnInit();
		expect(component.namespace).toBe('6ba7b811-9dad-11d1-80b4-00c04fd430c8');
		expect(component.name).toBe('test');
	});

	it('should generate a valid v1 UUID', () => {
		component.uuidVersion = 'v1';
		component.generateUuid();
		expect(uuidValidate(component.value())).toBe(true);
	});

	it('should generate a valid v4 UUID', () => {
		component.uuidVersion = 'v4';
		component.generateUuid();
		expect(uuidValidate(component.value())).toBe(true);
	});

	it('should generate a valid v7 UUID', () => {
		component.uuidVersion = 'v7';
		component.generateUuid();
		expect(uuidValidate(component.value())).toBe(true);
	});

	it('should generate a v3 UUID with name', () => {
		component.uuidVersion = 'v3';
		component.name = 'test-name';
		component.generateUuid();
		expect(uuidValidate(component.value())).toBe(true);
	});

	it('should generate a v5 UUID with name', () => {
		component.uuidVersion = 'v5';
		component.name = 'test-name';
		component.generateUuid();
		expect(uuidValidate(component.value())).toBe(true);
	});

	it('should generate deterministic v5 UUID for same inputs', () => {
		component.uuidVersion = 'v5';
		component.name = 'test';
		component.namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
		component.generateUuid();
		const firstUuid = component.value();

		component.generateUuid();
		const secondUuid = component.value();

		expect(firstUuid).toBe(secondUuid);
	});

	it('should emit onFieldChange when UUID is generated', () => {
		vi.spyOn(component.onFieldChange, 'emit');
		component.generateUuid();
		expect(component.onFieldChange.emit).toHaveBeenCalled();
	});

	it('should fallback to v4 for unknown version', () => {
		component.uuidVersion = 'v99' as any;
		component.generateUuid();
		expect(uuidValidate(component.value())).toBe(true);
	});

	it('should validate a valid UUID', () => {
		expect(component.validateUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
	});

	it('should invalidate a non-UUID string', () => {
		expect(component.validateUuid('not-a-uuid')).toBe(false);
	});

	it('should return UUID version for valid UUID', () => {
		const result = component.getUuidVersion('550e8400-e29b-41d4-a716-446655440000');
		expect(result).toBe(4);
	});

	it('should return false for invalid UUID in getUuidVersion', () => {
		const result = component.getUuidVersion('invalid');
		expect(result).toBe(false);
	});

	it('should have available versions list', () => {
		expect(component.availableVersions.length).toBe(5);
		expect(component.availableVersions.map((v) => v.value)).toEqual(['v1', 'v3', 'v4', 'v5', 'v7']);
	});

	it('should have standard namespaces', () => {
		expect(component.namespaces.length).toBe(4);
		expect(component.namespaces.map((n) => n.label)).toEqual(['DNS', 'URL', 'OID', 'X500']);
	});
});
