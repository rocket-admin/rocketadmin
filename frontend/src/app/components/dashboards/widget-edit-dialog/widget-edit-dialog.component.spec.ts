import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { SavedQuery } from 'src/app/models/saved-query';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { WidgetEditDialogComponent } from './widget-edit-dialog.component';

describe('WidgetEditDialogComponent', () => {
	let component: WidgetEditDialogComponent;
	let fixture: ComponentFixture<WidgetEditDialogComponent>;
	let mockDashboardsService: Partial<DashboardsService>;
	let mockSavedQueriesService: Partial<SavedQueriesService>;
	let savedQueriesSignal: WritableSignal<SavedQuery[]>;

	beforeEach(async () => {
		savedQueriesSignal = signal<SavedQuery[]>([]);

		mockDashboardsService = {
			createWidget: vi.fn(),
			updateWidget: vi.fn(),
		} as Partial<DashboardsService>;

		mockSavedQueriesService = {
			savedQueries: savedQueriesSignal.asReadonly(),
			setActiveConnection: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [WidgetEditDialogComponent, BrowserAnimationsModule, Angulartics2Module.forRoot()],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: MAT_DIALOG_DATA,
					useValue: { connectionId: 'test-conn', dashboardId: 'test-dash', widget: null },
				},
				{ provide: MatDialogRef, useValue: { close: vi.fn() } },
				{ provide: DashboardsService, useValue: mockDashboardsService },
				{ provide: SavedQueriesService, useValue: mockSavedQueriesService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(WidgetEditDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
