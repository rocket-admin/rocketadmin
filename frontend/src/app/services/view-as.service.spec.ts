import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ViewAsService } from './view-as.service';

describe('ViewAsService', () => {
	let routerEvents$: Subject<unknown>;
	let queryParamValue: string | null;
	let routerStub: {
		events: Subject<unknown>;
		routerState: { snapshot: { root: { queryParamMap: { get: (key: string) => string | null } } } };
		url: string;
		navigate: ReturnType<typeof vi.fn>;
	};
	let locationStub: { replaceState: ReturnType<typeof vi.fn> };

	function setup(initialUrl: string, initialViewAs: string | null = null): ViewAsService {
		queryParamValue = initialViewAs;
		routerEvents$ = new Subject<unknown>();
		routerStub = {
			events: routerEvents$,
			routerState: {
				snapshot: {
					root: {
						queryParamMap: {
							get: (key: string) => (key === 'viewAs' ? queryParamValue : null),
						},
					},
				},
			},
			url: initialUrl,
			navigate: vi.fn(),
		};
		locationStub = { replaceState: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				ViewAsService,
				{ provide: Router, useValue: routerStub },
				{ provide: Location, useValue: locationStub },
			],
		});

		return TestBed.inject(ViewAsService);
	}

	function emitNavigationEnd(url: string, newViewAs: string | null) {
		queryParamValue = newViewAs;
		routerStub.url = url;
		routerEvents$.next(new NavigationEnd(1, url, url));
	}

	it('reads initial viewAs from the current URL on construction', () => {
		const service = setup('/permissions/abc?viewAs=group-1', 'group-1');
		expect(service.viewAsGroupId()).toBe('group-1');
		expect(service.isActive()).toBe(true);
	});

	it('starts inactive when no viewAs param is present', () => {
		const service = setup('/permissions/abc');
		expect(service.viewAsGroupId()).toBe(null);
		expect(service.isActive()).toBe(false);
	});

	it('updates the signal when a NavigationEnd delivers a new viewAs', () => {
		const service = setup('/permissions/abc');
		emitNavigationEnd('/dashboard/abc?viewAs=group-2', 'group-2');
		expect(service.viewAsGroupId()).toBe('group-2');
	});

	it('re-injects viewAs into the URL via Location.replaceState when navigation drops it', () => {
		const service = setup('/permissions/abc?viewAs=group-1', 'group-1');
		expect(service.viewAsGroupId()).toBe('group-1');

		emitNavigationEnd('/dashboard/abc', null);

		expect(locationStub.replaceState).toHaveBeenCalledOnce();
		const urlArg = locationStub.replaceState.mock.calls[0][0] as string;
		expect(urlArg).toContain('/dashboard/abc');
		expect(urlArg).toContain('viewAs=group-1');
		// Signal stays set — we are persisting it across navigation
		expect(service.viewAsGroupId()).toBe('group-1');
	});

	it('preserves existing query params when re-injecting viewAs', () => {
		setup('/?viewAs=group-1', 'group-1');

		emitNavigationEnd('/dashboard/abc?page=2', null);

		expect(locationStub.replaceState).toHaveBeenCalledOnce();
		const urlArg = locationStub.replaceState.mock.calls[0][0] as string;
		expect(urlArg).toContain('page=2');
		expect(urlArg).toContain('viewAs=group-1');
	});

	it('does not call replaceState when both signal and URL are empty', () => {
		setup('/permissions/abc');
		emitNavigationEnd('/dashboard/abc', null);
		expect(locationStub.replaceState).not.toHaveBeenCalled();
	});

	it('clearViewAs resets the signal and routes to drop the param', () => {
		const service = setup('/permissions/abc?viewAs=group-1', 'group-1');

		service.clearViewAs();

		expect(service.viewAsGroupId()).toBe(null);
		expect(routerStub.navigate).toHaveBeenCalledWith(
			[],
			expect.objectContaining({
				queryParams: { viewAs: null },
				queryParamsHandling: 'merge',
				replaceUrl: true,
			}),
		);
	});
});
