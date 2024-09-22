import * as path from 'path';
import { Utility } from '../../Utility';

describe('Utility.normalizePath', () => {
    it('should resolve a relative path to an absolute path', () => {
        const relativePath = 'folder/file.txt';
        const expectedPath = path.resolve(relativePath); // Resolve to absolute path

        const result = Utility.normalizePath(relativePath);
        expect(result).toBe(expectedPath);
    });

    it('should resolve a path with trailing slashes and remove them for non-root paths', () => {
        const pathWithTrailingSlash = path.join('folder', 'subfolder') + path.sep;
        const expectedPath = path.resolve('folder', 'subfolder'); // Resolves to absolute path

        const result = Utility.normalizePath(pathWithTrailingSlash);
        expect(result).toBe(expectedPath); // No trailing slash
    });

    it('should keep the root path unchanged with a trailing slash', () => {
        const rootPath = path.parse(path.resolve('/')).root; // Root path (e.g., "/" or "C:\\")
        const result = Utility.normalizePath(rootPath);

        expect(result).toBe(rootPath); // Root path should remain unchanged
    });

    it('should resolve and normalize complex paths with relative segments', () => {
        const relativeComplexPath = './folder/subfolder/../file.txt';
        const expectedPath = path.resolve('folder/file.txt'); // Resolves and removes "../"

        const result = Utility.normalizePath(relativeComplexPath);
        expect(result).toBe(expectedPath);
    });

    it('should handle paths with multiple trailing slashes and remove them for non-root paths', () => {
        const pathWithMultipleSlashes = path.join('folder', 'subfolder') + path.sep + path.sep;
        const expectedPath = path.resolve('folder', 'subfolder'); // Resolves to absolute path, without trailing slashes

        const result = Utility.normalizePath(pathWithMultipleSlashes);
        expect(result).toBe(expectedPath); // No trailing slashes
    });
});
