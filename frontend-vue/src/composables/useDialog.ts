// Programmatic dialogs, replacing MatDialog. Keeps the Angular call shape so the 47 dialogs port
// mechanically:
//
//   const dialog = useDialog();
//   const result = await dialog.open(DeleteRowDialog, { data: { row } }).afterClosed();
//
// The dialog component receives `data` as a prop and closes itself through `useDialogRef()`
// (AppDialog and AppDialogForm do that for it on Escape, backdrop and Cancel).
import { defineStore } from 'pinia';
import { type Component, type InjectionKey, inject, markRaw, ref, shallowRef } from 'vue';

export interface DialogRef<R = unknown> {
	readonly id: number;
	close(result?: R): void;
	/** Resolves with the value passed to `close()`, or `undefined` when dismissed. */
	afterClosed(): Promise<R | undefined>;
}

export interface DialogConfig<D> {
	data?: D;
}

export interface DialogEntry {
	id: number;
	component: Component;
	data: unknown;
	ref: DialogRef;
}

export const DIALOG_REF: InjectionKey<DialogRef> = Symbol('DialogRef');

export const useDialogsStore = defineStore('dialogs', () => {
	const entries = shallowRef<DialogEntry[]>([]);
	const counter = ref(0);

	function open<R = unknown, D = unknown>(component: Component, config: DialogConfig<D> = {}): DialogRef<R> {
		const id = ++counter.value;
		let resolveClosed: (value: R | undefined) => void = () => {};
		const closed = new Promise<R | undefined>((resolve) => {
			resolveClosed = resolve;
		});
		let isClosed = false;

		const dialogRef: DialogRef<R> = {
			id,
			close(result?: R) {
				if (isClosed) return;
				isClosed = true;
				entries.value = entries.value.filter((entry) => entry.id !== id);
				resolveClosed(result);
			},
			afterClosed: () => closed,
		};

		entries.value = [
			...entries.value,
			{ id, component: markRaw(component), data: config.data, ref: dialogRef as DialogRef },
		];
		return dialogRef;
	}

	function closeAll(): void {
		for (const entry of [...entries.value]) entry.ref.close();
	}

	return { entries, open, closeAll };
});

export function useDialog() {
	const store = useDialogsStore();
	return {
		open: store.open,
		closeAll: store.closeAll,
	};
}

/** Inside a dialog opened with `useDialog().open()`: the handle to close it with a result. */
export function useDialogRef<R = unknown>(): DialogRef<R> {
	const dialogRef = inject(DIALOG_REF, null);
	if (!dialogRef) throw new Error('useDialogRef() must be called inside a dialog opened with useDialog().open()');
	return dialogRef as DialogRef<R>;
}

/** Same as useDialogRef(), but null when the component is rendered inline rather than opened. */
export function useOptionalDialogRef<R = unknown>(): DialogRef<R> | null {
	return inject(DIALOG_REF, null) as DialogRef<R> | null;
}
