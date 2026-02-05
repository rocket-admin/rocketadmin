import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { Dashboard } from 'src/app/models/dashboard';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { DashboardViewComponent } from './dashboard-view.component';

describe('DashboardViewComponent', () => {
	let component: DashboardViewComponent;
	let fixture: ComponentFixture<DashboardViewComponent>;
	let mockDashboardsService: Partial<DashboardsService>;
	let mockConnectionsService: Partial<ConnectionsService>;
	let dashboardSignal: WritableSignal<Dashboard | null>;
	let dashboardLoadingSignal: WritableSignal<boolean>;

	beforeEach(async () => {
		dashboardSignal = signal<Dashboard | null>(null);
		dashboardLoadingSignal = signal<boolean>(false);

		mockDashboardsService = {
			dashboard: dashboardSignal.asReadonly(),
			dashboardLoading: dashboardLoadingSignal.asReadonly(),
			setActiveConnection: vi.fn(),
			setActiveDashboard: vi.fn(),
			refreshDashboard: vi.fn(),
		};

		mockConnectionsService = {
			getCurrentConnectionTitle: vi.fn().mockReturnValue(of('Test Connection')),
		};

		await TestBed.configureTestingModule({
			imports: [DashboardViewComponent, BrowserAnimationsModule, RouterTestingModule, Angulartics2Module.forRoot()],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: DashboardsService, useValue: mockDashboardsService },
				{ provide: ConnectionsService, useValue: mockConnectionsService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DashboardViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
