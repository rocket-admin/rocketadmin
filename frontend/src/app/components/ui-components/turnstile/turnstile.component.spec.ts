import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TurnstileComponent } from './turnstile.component';

describe('TurnstileComponent', () => {
	let component: TurnstileComponent;
	let fixture: ComponentFixture<TurnstileComponent>;
	let mockWidgetId: string;

	beforeEach(async () => {
		mockWidgetId = 'mock-widget-id';

		window.turnstile = {
			render: jasmine.createSpy('render').and.returnValue(mockWidgetId),
			reset: jasmine.createSpy('reset'),
			getResponse: jasmine.createSpy('getResponse'),
			remove: jasmine.createSpy('remove'),
		};

		await TestBed.configureTestingModule({
			imports: [TurnstileComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(TurnstileComponent);
		component = fixture.componentInstance;
	});

	afterEach(() => {
		delete window.turnstile;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should render turnstile widget on init', fakeAsync(() => {
		fixture.detectChanges();
		tick(100);

		expect(window.turnstile?.render).toHaveBeenCalled();
	}));

	it('should emit tokenReceived when callback is triggered', fakeAsync(() => {
		let receivedToken: string | null = null;
		component.tokenReceived.subscribe((token: string) => {
			receivedToken = token;
		});

		(window.turnstile?.render as jasmine.Spy).and.callFake((_container: any, options: any) => {
			options.callback('test-token');
			return mockWidgetId;
		});

		fixture.detectChanges();
		tick(100);

		expect(receivedToken).toBe('test-token');
	}));

	it('should emit tokenError when error-callback is triggered', fakeAsync(() => {
		let errorEmitted = false;
		component.tokenError.subscribe(() => {
			errorEmitted = true;
		});

		(window.turnstile?.render as jasmine.Spy).and.callFake((_container: any, options: any) => {
			options['error-callback']();
			return mockWidgetId;
		});

		fixture.detectChanges();
		tick(100);

		expect(errorEmitted).toBeTrue();
	}));

	it('should emit tokenExpired when expired-callback is triggered', fakeAsync(() => {
		let expiredEmitted = false;
		component.tokenExpired.subscribe(() => {
			expiredEmitted = true;
		});

		(window.turnstile?.render as jasmine.Spy).and.callFake((_container: any, options: any) => {
			options['expired-callback']();
			return mockWidgetId;
		});

		fixture.detectChanges();
		tick(100);

		expect(expiredEmitted).toBeTrue();
	}));

	it('should reset the widget when reset() is called', fakeAsync(() => {
		fixture.detectChanges();
		tick(100);

		component.reset();

		expect(window.turnstile?.reset).toHaveBeenCalledWith(mockWidgetId);
	}));

	it('should remove widget on destroy', fakeAsync(() => {
		fixture.detectChanges();
		tick(100);

		component.ngOnDestroy();

		expect(window.turnstile?.remove).toHaveBeenCalledWith(mockWidgetId);
	}));

	it('should emit error if turnstile fails to load', fakeAsync(() => {
		delete window.turnstile;
		let errorEmitted = false;
		component.tokenError.subscribe(() => {
			errorEmitted = true;
		});

		fixture.detectChanges();
		tick(5100);

		expect(errorEmitted).toBeTrue();
	}));
});
