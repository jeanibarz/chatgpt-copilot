import { Utility } from '../../Utility';

describe('Utility.getErrorMessage', () => {
    it('should return the message of an Error object', () => {
        const error = new Error('This is an error');
        const result = Utility.getErrorMessage(error);
        expect(result).toBe('This is an error');
    });

    it('should return a string representation of a non-Error object', () => {
        const error = { message: 'Not an error instance' };
        const result = Utility.getErrorMessage(error);
        expect(result).toBe('[object Object]');
    });

    it('should return a string for primitive values', () => {
        const error = 42;
        const result = Utility.getErrorMessage(error);
        expect(result).toBe('42');
    });

    it('should return "undefined" for undefined input', () => {
        const result = Utility.getErrorMessage(undefined);
        expect(result).toBe('undefined');
    });

    it('should return "null" for null input', () => {
        const result = Utility.getErrorMessage(null);
        expect(result).toBe('null');
    });
});
