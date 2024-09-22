import { Utility } from '../../Utility';

describe('Utility.getRandomId', () => {
    it('should return a string', () => {
        const id = Utility.getRandomId();
        expect(typeof id).toBe('string');
    });

    it('should return a string of length 32', () => {
        const id = Utility.getRandomId();
        expect(id).toHaveLength(32);
    });

    it('should only contain alphanumeric characters', () => {
        const id = Utility.getRandomId();
        const regex = /^[A-Za-z0-9]+$/;
        expect(regex.test(id)).toBe(true);
    });

    it('should generate different IDs on each call', () => {
        const id1 = Utility.getRandomId();
        const id2 = Utility.getRandomId();
        expect(id1).not.toEqual(id2);
    });
});
