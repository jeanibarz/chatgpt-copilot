import { Utility } from '../../Utility';

describe('Utility.isString', () => {
    it('should return true for a string value', () => {
        const result = Utility.isString('Hello, World!');
        expect(result).toBe(true);
    });

    it('should return false for a number value', () => {
        const result = Utility.isString(12345);
        expect(result).toBe(false);
    });

    it('should return false for an object', () => {
        const result = Utility.isString({ key: 'value' });
        expect(result).toBe(false);
    });

    it('should return false for an array', () => {
        const result = Utility.isString(['a', 'b', 'c']);
        expect(result).toBe(false);
    });

    it('should return false for null', () => {
        const result = Utility.isString(null);
        expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
        const result = Utility.isString(undefined);
        expect(result).toBe(false);
    });
});
