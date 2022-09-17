import { normalizeTableName, normalizeFieldName } from './normalize';

describe('Normalize function', () => {
    it('should modify name', () => {
        const normalizedName = normalizeTableName('TABLE_USER');
        expect(normalizedName).toEqual('Table Users');
    });

    it('should pluralise name', () => {
        const normalizedName = normalizeTableName('USER');
        expect(normalizedName).toEqual('Users');
    });

    it('normalize camel case and capitalize', () => {
        const normalizedName = normalizeFieldName('affiliateStripeNumber');
        expect(normalizedName).toEqual('Affiliate stripe number');
    });

    it('normalize camel case, capitalize and uppercase acronyms', () => {
        const normalizedName = normalizeFieldName('affiliateStripeId');
        expect(normalizedName).toEqual('Affiliate stripe ID');
    });
});