import * as path from 'path';

// Mock 'fs' module
jest.mock('fs', () => ({
    unlink: jest.fn((_, callback) => callback(null)),
}));

// Mock 'vscode' module
jest.mock('vscode', () => {
    const pathModule = require('path');
    return {
        Uri: {
            file: jest.fn((filePath: string) => ({
                fsPath: pathModule.resolve(filePath), // Use absolute path
                toString: jest.fn(() => `uri:${filePath}`),
            })),
        },
        workspace: {
            onDidCloseTextDocument: jest.fn(),
        },
        window: {
            createOutputChannel: jest.fn(() => ({
                appendLine: jest.fn(),
                show: jest.fn(),
            })),
        },
    };
});

// Import after mocks to ensure the module under test uses the mocked versions
import * as fs from 'fs';
import * as vscode from 'vscode';

import { GenerateDocstringsCommand } from '../../GenerateDocstringsCommand';

describe('GenerateDocstringsCommand - cleanupTempFile', () => {
    let command: GenerateDocstringsCommand;
    let tempFilePath: string;
    let mockListener: { dispose: jest.Mock; };

    beforeEach(() => {
        jest.clearAllMocks();
        command = new GenerateDocstringsCommand();
        tempFilePath = 'mockTempFile.ts';

        // Mock the listener
        mockListener = { dispose: jest.fn() };
        (vscode.workspace.onDidCloseTextDocument as jest.Mock).mockImplementationOnce((callback) => {
            return mockListener;
        });
    });

    it('should set up a listener and delete the temp file when the document is closed', () => {
        command['cleanupTempFile'](tempFilePath);

        const mockDoc = { uri: vscode.Uri.file('mockTempFile.ts') }; // Matching path
        const callback = (vscode.workspace.onDidCloseTextDocument as jest.Mock).mock.calls[0][0];
        callback(mockDoc);

        expect(fs.unlink).toHaveBeenCalledWith(path.resolve(tempFilePath), expect.any(Function));
        expect(mockListener.dispose).toHaveBeenCalled();
    });

    it('should not delete the temp file if the closed document URI does not match', () => {
        command['cleanupTempFile'](tempFilePath);

        const mockDoc = { uri: vscode.Uri.file('differentFile.ts') }; // Different path
        const callback = (vscode.workspace.onDidCloseTextDocument as jest.Mock).mock.calls[0][0];
        callback(mockDoc);

        // Ensure fs.unlink is not called because the URIs do not match
        expect(fs.unlink).not.toHaveBeenCalled();
        expect(mockListener.dispose).not.toHaveBeenCalled(); // Listener remains active
    });
});
