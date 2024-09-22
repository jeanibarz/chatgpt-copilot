import * as path from 'path';
import { Utility } from '../../Utility';

describe('Utility.parseNodePath', () => {
    it('should split the node path by the system path separator', () => {
        const nodePath = `folder${path.sep}subfolder${path.sep}file.txt`;
        const expectedParts = ['folder', 'subfolder', 'file.txt'];

        const result = Utility.parseNodePath(nodePath);
        expect(result).toEqual(expectedParts);
    });

    it('should return an array with a single element if no separator is present', () => {
        const nodePath = 'file.txt';
        const expectedParts = ['file.txt'];

        const result = Utility.parseNodePath(nodePath);
        expect(result).toEqual(expectedParts);
    });

    it('should handle paths with leading or trailing separators', () => {
        const nodePath = `${path.sep}folder${path.sep}subfolder${path.sep}`;
        const expectedParts = ['', 'folder', 'subfolder', ''];

        const result = Utility.parseNodePath(nodePath);
        expect(result).toEqual(expectedParts);
    });
});
