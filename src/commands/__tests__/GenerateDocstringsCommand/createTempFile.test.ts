import * as fs from 'fs';
import { GenerateDocstringsCommand } from '../../GenerateDocstringsCommand';

jest.mock('fs', () => ({
    writeFileSync: jest.fn(),
}));
jest.mock('os', () => ({
    tmpdir: jest.fn().mockReturnValue('/mock/tmpdir'),
}));
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        }))
    }
}));

describe('GenerateDocstringsCommand - createTempFile', () => {
    let command: GenerateDocstringsCommand;

    beforeEach(() => {
        command = new GenerateDocstringsCommand();
        jest.clearAllMocks();
    });

    it('should create a temporary file with the provided content', () => {
        const mockContent = 'This is a test content';
        const mockTimeStamp = 12345;
        jest.spyOn(Date, 'now').mockReturnValue(mockTimeStamp);

        // Call the method
        const tempFilePath = command['createTempFile'](mockContent);

        // Check that the temp file path is correctly generated
        expect(tempFilePath).toBe(`/mock/tmpdir/preSave-${mockTimeStamp}.ts`);

        // Ensure fs.writeFileSync is called with the correct arguments
        expect(fs.writeFileSync).toHaveBeenCalledWith(tempFilePath, mockContent);
    });
});
