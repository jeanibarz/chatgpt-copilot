import * as path from 'path';
import { Utility } from '../../Utility';

describe('Utility.getNodePath', () => {
    it('should return a path joined by path.sep when parentPath does not include "::"', () => {
        const parentPath = 'folder';
        const label = 'file.txt';
        const expectedPath = path.join(parentPath, label);

        const result = Utility.getNodePath(parentPath, label);
        expect(result).toBe(expectedPath);
    });

    it('should return a path joined by "::" when parentPath includes "::"', () => {
        const parentPath = 'folder::subfolder';
        const label = 'file.txt';
        const expectedPath = `${parentPath}::${label}`;

        const result = Utility.getNodePath(parentPath, label);
        expect(result).toBe(expectedPath);
    });

    it('should correctly append label even if it includes special characters', () => {
        const parentPath = 'folder';
        const label = 'fi@le$.txt';
        const expectedPath = path.join(parentPath, label);

        const result = Utility.getNodePath(parentPath, label);
        expect(result).toBe(expectedPath);
    });
});
