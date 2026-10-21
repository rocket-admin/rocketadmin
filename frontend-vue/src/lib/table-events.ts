// Replaces the string events that TablesService.cast ('delete rows', 'import', 'settings', ...) and
// TableRowService.cast ('delete row') broadcast after a successful mutation. They are genuinely
// fire-and-forget "something changed, refresh if you care" signals, so they stay a bus — but a
// typed one, with the table they concern in the payload.
import mitt from 'mitt';
import { getCurrentScope, onScopeDispose } from 'vue';

export interface TableEventPayload {
	connectionID: string;
	tableName: string;
}

export type TableEvents = {
	/** TableRowService 'delete row': one row deleted from the row edit/view. */
	rowDeleted: TableEventPayload;
	/** 'delete rows': bulk delete from the table view. */
	rowsDeleted: TableEventPayload;
	/** 'import': CSV import finished. */
	imported: TableEventPayload;
	/** 'activate actions': a custom action ran on the selected rows. */
	actionsActivated: TableEventPayload & { actionId: string };
	/** 'settings': table settings or personal view settings saved or reset. */
	settingsUpdated: TableEventPayload & { personal: boolean };
	/** 'delete-rule' */
	ruleDeleted: TableEventPayload & { ruleId: string };
	/** 'filters set saved' */
	savedFilterCreated: TableEventPayload;
	/** 'filters set updated' */
	savedFilterUpdated: TableEventPayload & { filterId: string };
	/** 'delete saved filters' */
	savedFilterDeleted: TableEventPayload & { filterId: string };
};

export const tableEvents = mitt<TableEvents>();

/**
 * Subscribes for the lifetime of the current component (or effect scope). Outside a scope the
 * caller owns the subscription and must call the returned function to stop listening.
 */
export function onTableEvent<K extends keyof TableEvents>(
	type: K,
	handler: (payload: TableEvents[K]) => void,
): () => void {
	tableEvents.on(type, handler);
	const off = () => tableEvents.off(type, handler);
	if (getCurrentScope()) onScopeDispose(off);
	return off;
}
