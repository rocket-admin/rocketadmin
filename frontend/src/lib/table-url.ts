// Paths of a table's pages. Table names are user data and can hold `?`, `#`, `%` or `/`, so each
// segment is encoded, like the Angular router does for `router.navigate([...])` commands; vue-router
// treats a `path` as already encoded and would otherwise cut the name at `?` or `#`.

export type TablePage = 'entry' | 'widgets' | 'settings' | 'actions';

/** `/dashboard/<connection>/<table>` or one of the table's sub-pages. */
export function tablePagePath(
	connectionId: string | null | undefined,
	tableName: string | null | undefined,
	page?: TablePage,
): string {
	const path = `/dashboard/${encodeURIComponent(connectionId ?? '')}/${encodeURIComponent(tableName ?? '')}`;
	return page ? `${path}/${page}` : path;
}
