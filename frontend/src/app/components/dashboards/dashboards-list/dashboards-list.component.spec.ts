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
import { DashboardsService, DashboardUpdateEvent } from 'src/app/services/dashboards.service';
import { DashboardsListComponent } from './dashboards-list.component';

describe('DashboardsListComponent', () => {
	let component: DashboardsListComponent;
	let fixture: ComponentFixture<DashboardsListComponent>;
	let mockDashboardsService: Partial<DashboardsService>;
	let mockConnectionsService: Partial<ConnectionsService>;
	let dashboardsUpdatedSignal: WritableSignal<DashboardUpdateEvent>;
	let dashboardsSignal: WritableSignal<Dashboard[]>;
	let dashboardsLoadingSignal: WritableSignal<boolean>;

	beforeEach(async () => {
		dashboardsUpdatedSignal = signal<DashboardUpdateEvent>('');
		dashboardsSignal = signal<Dashboard[]>([]);
		dashboardsLoadingSignal = signal<boolean>(false);

		mockDashboardsService = {
			dashboards: dashboardsSignal.asReadonly(),
			dashboardsLoading: dashboardsLoadingSignal.asReadonly(),
			dashboardsUpdated: dashboardsUpdatedSignal.asReadonly(),
			setActiveConnection: vi.fn(),
			setActiveDashboard: vi.fn(),
			refreshDashboards: vi.fn(),
		};

		mockConnectionsService = {
			getCurrentConnectionTitle: vi.fn().mockReturnValue(of('Test Connection')),
		};

		await TestBed.configureTestingModule({
			imports: [DashboardsListComponent, BrowserAnimationsModule, RouterTestingModule, Angulartics2Module.forRoot()],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: DashboardsService, useValue: mockDashboardsService },
				{ provide: ConnectionsService, useValue: mockConnectionsService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DashboardsListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
