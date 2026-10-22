// The export dialog's downloadCSV(): saves the CSV text the server returned as `database.csv`.
export function downloadCsv(data: string): void {
	const blob = new Blob([data], { type: 'text/csv' });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = 'database.csv';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(link.href);
}
