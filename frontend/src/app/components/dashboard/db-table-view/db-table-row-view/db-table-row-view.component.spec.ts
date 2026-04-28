import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { DbTableRowViewComponent } from './db-table-row-view.component';

describe('DbTableRowViewComponent', () => {
	let component: DbTableRowViewComponent;
	let fixture: ComponentFixture<DbTableRowViewComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [MatSnackBarModule, DbTableRowViewComponent, Angulartics2Module.forRoot()],
			providers: [provideHttpClient(), { provide: ActivatedRoute, useValue: {} }],
		});
		fixture = TestBed.createComponent(DbTableRowViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('getForeignKeyValue', () => {
		const baseRow = {
			foreignKeys: {
				user_id: {
					column_name: 'user_id',
					constraint_name: 'fk_user',
					referenced_column_name: 'id',
					referenced_table_name: 'users',
				},
			},
		};

		it('returns null when record field is null', () => {
			component.selectedRow = { ...baseRow, record: { user_id: null } } as any;
			expect(component.getForeignKeyValue('user_id')).toBeNull();
		});

		it('returns null when record field is undefined', () => {
			component.selectedRow = { ...baseRow, record: {} } as any;
			expect(component.getForeignKeyValue('user_id')).toBeNull();
		});

		it('returns identity column value when FK object has one', () => {
			component.selectedRow = {
				...baseRow,
				record: { user_id: { id: 42, name: 'alice' } },
			} as any;
			expect(component.getForeignKeyValue('user_id')).toBe('alice');
		});

		it('returns primitive FK value as-is (including 0)', () => {
			component.selectedRow = { ...baseRow, record: { user_id: 0 } } as any;
			expect(component.getForeignKeyValue('user_id')).toBe(0);
		});

		it('returns primitive FK value as-is (including empty string)', () => {
			component.selectedRow = { ...baseRow, record: { user_id: '' } } as any;
			expect(component.getForeignKeyValue('user_id')).toBe('');
		});
	});

	describe('getForeignKeyQueryParams', () => {
		const baseRow = {
			foreignKeys: {
				user_id: {
					column_name: 'user_id',
					constraint_name: 'fk_user',
					referenced_column_name: 'id',
					referenced_table_name: 'users',
				},
			},
		};

		it('returns {} when record field is null', () => {
			component.selectedRow = { ...baseRow, record: { user_id: null } } as any;
			expect(component.getForeignKeyQueryParams('user_id')).toEqual({});
		});

		it('returns referenced column param when FK is an object', () => {
			component.selectedRow = {
				...baseRow,
				record: { user_id: { id: 42, name: 'alice' } },
			} as any;
			expect(component.getForeignKeyQueryParams('user_id')).toEqual({ id: 42 });
		});

		it('returns referenced column param when FK is a primitive', () => {
			component.selectedRow = { ...baseRow, record: { user_id: 7 } } as any;
			expect(component.getForeignKeyQueryParams('user_id')).toEqual({ id: 7 });
		});
	});
});
