import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TurnstileComponent } from './turnstile.component';

describe('TurnstileComponent', () => {
	let component: TurnstileComponent;
	let fixture: ComponentFixture<TurnstileComponent>;
	let mockWidgetId: string;

	const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	beforeEach(async () => {
		mockWidgetId = 'mock-widget-id';

		(window as any).turnstile = {
			render: vi.fn().mockReturnValue(mockWidgetId),
			reset: vi.fn(),
			getResponse: vi.fn(),
			remove: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [TurnstileComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(TurnstileComponent);
		component = fixture.componentInstance;
	});

	afterEach(() => {
		component.ngOnDestroy();
		delete (window as any).turnstile;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should render turnstile widget on init', async () => {
		fixture.detectChanges();
		await delay(150);

		expect((window as any).turnstile?.render).toHaveBeenCalled();
	});

	it('should emit tokenReceived when callback is triggered', async () => {
		let receivedToken: string | null = null;
		component.tokenReceived.subscribe((token: string) => {
			receivedToken = token;
		});

		((window as any).turnstile?.render as ReturnType<typeof vi.fn>).mockImplementation(
			(_container: any, options: any) => {
				options.callback('test-token');
				return mockWidgetId;
			},
		);

		fixture.detectChanges();
		await delay(150);

		expect(receivedToken).toBe('test-token');
	});

	it('should emit tokenError when error-callback is triggered', async () => {
		let errorEmitted = false;
		component.tokenError.subscribe(() => {
			errorEmitted = true;
		});

		((window as any).turnstile?.render as ReturnType<typeof vi.fn>).mockImplementation(
			(_container: any, options: any) => {
				options['error-callback']();
				return mockWidgetId;
			},
		);

		fixture.detectChanges();
		await delay(150);

		expect(errorEmitted).toBe(true);
	});

	it('should emit tokenExpired when expired-callback is triggered', async () => {
		let expiredEmitted = false;
		component.tokenExpired.subscribe(() => {
			expiredEmitted = true;
		});

		((window as any).turnstile?.render as ReturnType<typeof vi.fn>).mockImplementation(
			(_container: any, options: any) => {
				options['expired-callback']();
				return mockWidgetId;
			},
		);

		fixture.detectChanges();
		await delay(150);

		expect(expiredEmitted).toBe(true);
	});

	it('should reset the widget when reset() is called', async () => {
		fixture.detectChanges();
		await delay(150);

		component.reset();

		expect((window as any).turnstile?.reset).toHaveBeenCalledWith(mockWidgetId);
	});

	it('should remove widget on destroy', async () => {
		fixture.detectChanges();
		await delay(150);

		component.ngOnDestroy();

		expect((window as any).turnstile?.remove).toHaveBeenCalledWith(mockWidgetId);
	});

	it('should emit error if turnstile fails to load', async () => {
		delete (window as any).turnstile;
		let errorEmitted = false;
		component.tokenError.subscribe(() => {
			errorEmitted = true;
		});

		fixture.detectChanges();
		// MAX_POLL_ATTEMPTS (50) * POLL_INTERVAL_MS (100) = 5000ms
		await delay(5200);

		expect(errorEmitted).toBe(true);
	}, 10000);
});
