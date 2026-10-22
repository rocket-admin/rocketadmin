// Port of frontend/src/app/components/audit/audit-data-source.ts: one server-side page of the
// connection's audit log, formatted for the table, plus the paginator state the response sets.
import { format } from 'date-fns';
import { ref, shallowRef } from 'vue';
import { useConnectionsStore } from '@/stores/connections';

/** One entry of GET /logs/:connectionId. */
export interface AuditLogRecord {
	table_name: string;
	email: string;
	operationType: string;
	operationStatusResult: string;
	createdAt: string;
	old_data: Record<string, unknown> | null;
	received_data: Record<string, unknown> | null;
}

/** GET /logs/:connectionId */
export interface AuditLogResponse {
	logs: AuditLogRecord[];
	pagination: { total: number; perPage: number; currentPage?: number; lastPage?: number };
}

/** What the info dialog reads from a log row. */
export interface AuditLogDetails {
	Table: string;
	User: string;
	Status: string;
	operationType: string;
	createdAt: string;
	prevValue: Record<string, unknown> | null;
	currentValue: Record<string, unknown> | null;
}

/** A log row as the audit page shows it. */
export interface AuditRow extends AuditLogDetails {
	UserEmail: string;
	Action: string | undefined;
	ActionIcon: string | undefined;
	Date: string;
	DateOnly: string;
	TimeOnly: string;
	IsAddAction: boolean;
}

export interface AuditLogFilters {
	connectionID: string;
	/** 'showAll' means no filter. */
	tableName: string;
	/** 'showAll' means no filter. */
	userEmail: string;
}

const ACTIONS: Record<string, string> = {
	addRow: 'Created',
	deleteRow: 'Deleted',
	updateRow: 'Edited',
	rowReceived: 'Viewed',
	rowsReceived: 'Viewed',
	importRows: 'Imported',
	exportRows: 'Exported',
};

const ACTION_ICONS: Record<string, string> = {
	addRow: 'add',
	deleteRow: 'delete',
	updateRow: 'edit',
	rowReceived: 'visibility',
	rowsReceived: 'visibility',
	importRows: 'upload',
	exportRows: 'download',
};

export function formatAuditLog(log: AuditLogRecord): AuditRow {
	const date = new Date(log.createdAt);
	return {
		Table: log.table_name,
		User: log.email,
		UserEmail: log.email,
		Action: ACTIONS[log.operationType],
		ActionIcon: ACTION_ICONS[log.operationType],
		Date: format(date, "d MMM yyyy 'at' h:mm a"),
		DateOnly: format(date, 'd MMM yyyy'),
		TimeOnly: format(date, 'h:mm a'),
		Status: log.operationStatusResult,
		operationType: log.operationType,
		createdAt: log.createdAt,
		prevValue: log.old_data,
		currentValue: log.received_data,
		IsAddAction: log.operationType === 'addRow',
	};
}

export function useAuditLog() {
	const connections = useConnectionsStore();

	const rows = shallowRef<AuditRow[]>([]);
	const loading = ref(false);
	/** Zero-based, as the paginator holds it. */
	const pageIndex = ref(0);
	const pageSize = ref(30);
	const length = ref(0);

	async function fetchLogs({ connectionID, tableName, userEmail }: AuditLogFilters): Promise<void> {
		loading.value = true;
		try {
			const res = await connections.fetchAuditLog<AuditLogResponse>({
				connectionID,
				tableName,
				userEmail,
				requstedPage: pageIndex.value + 1,
				chunkSize: pageSize.value || 30,
			});
			rows.value = res.logs.map(formatAuditLog);
			pageSize.value = res.pagination.perPage;
			length.value = res.pagination.total;
		} catch {
			// The store has shown the error; the previous page stays on screen.
		} finally {
			loading.value = false;
		}
	}

	return { rows, loading, pageIndex, pageSize, length, fetchLogs };
}
