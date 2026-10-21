export interface Money {
	code: string;
	name: string;
	symbol: string;
	flag?: string;
}

export interface MoneyValue {
	amount: number | string;
	currency: string;
}

export const CURRENCIES: Money[] = [
	{ code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
	{ code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
	{ code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
	{ code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
	{ code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
	{ code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
	{ code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
	{ code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
	{ code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
	{ code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
	{ code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
	{ code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
	{ code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
	{ code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
	{ code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
	{ code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
	{ code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
	{ code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' },
	{ code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
	{ code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
	{ code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
	{ code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
	{ code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
	{ code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
	{ code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
	{ code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' },
	{ code: 'EGP', name: 'Egyptian Pound', symbol: '£', flag: '🇪🇬' },
	{ code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
	{ code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
	{ code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
	{ code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
	{ code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
	{ code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', flag: '🇺🇦' },
];

export function getCurrencyByCode(code: string): Money | undefined {
	return CURRENCIES.find((currency) => currency.code === code);
}

export function getCurrencySymbol(code: string): string {
	const currency = getCurrencyByCode(code);
	return currency ? currency.symbol : '';
}

export const ZERO_DECIMAL_CURRENCIES = new Set<string>([
	'BIF',
	'CLP',
	'DJF',
	'GNF',
	'JPY',
	'KMF',
	'KRW',
	'MGA',
	'PYG',
	'RWF',
	'UGX',
	'VND',
	'VUV',
	'XAF',
	'XOF',
	'XPF',
]);

export function isZeroDecimalCurrency(code: string): boolean {
	return ZERO_DECIMAL_CURRENCIES.has(code);
}

export function getCurrencyDecimalPlaces(code: string): number {
	return isZeroDecimalCurrency(code) ? 0 : 2;
}

export function getCurrencyMinorUnitFactor(code: string): number {
	return isZeroDecimalCurrency(code) ? 1 : 100;
}
