/**
 * Copies text to the clipboard — the `cdkCopyToClipboard` replacement. Resolves false instead of
 * throwing when the Clipboard API is unavailable or denied, so a caller only has to branch.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
