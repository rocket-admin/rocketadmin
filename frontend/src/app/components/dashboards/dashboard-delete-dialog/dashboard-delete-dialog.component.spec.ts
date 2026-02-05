import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { DashboardDeleteDialogComponent } from './dashboard-delete-dialog.component';

describe('DashboardDeleteDialogComponent', () => {
	let component: DashboardDeleteDialogComponent;
	let fixture: ComponentFixture<DashboardDeleteDialogComponent>;
	let mockDashboardsService: Partial<DashboardsService>;

	beforeEach(async () => {
		mockDashboardsService = {
			deleteDashboard: vi.fn(),
		} as Partial<DashboardsService>;

		await TestBed.configureTestingModule({
			imports: [DashboardDeleteDialogComponent, BrowserAnimationsModule, Angulartics2Module.forRoot()],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						connectionId: 'test-conn',
						dashboard: { id: 'test-id', name: 'Test Dashboard' },
					},
				},
				{ provide: MatDialogRef, useValue: { close: vi.fn() } },
				{ provide: DashboardsService, useValue: mockDashboardsService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DashboardDeleteDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
