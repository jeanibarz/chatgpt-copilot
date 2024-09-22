import * as vscode from 'vscode';
import { GenerateDocstringsCommand } from '../../GenerateDocstringsCommand';

jest.mock('vscode', () => ({
    Uri: {
        file: jest.fn((path: string) => ({ path })),
    },
    commands: {
        executeCommand: jest.fn(),
    },
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        }))
    },
}));

describe('GenerateDocstringsCommand - showDiff', () => {
    let command: GenerateDocstringsCommand;

    beforeEach(() => {
        command = new GenerateDocstringsCommand();
        jest.clearAllMocks();
    });

    it('should show the diff between the original and temporary file', async () => {
        const originalUri = vscode.Uri.file('originalFile.ts');
        const tempFilePath = 'tempFilePath.ts';

        // Call the method
        await command['showDiff'](originalUri, tempFilePath);

        // Ensure the diff command was executed with the correct arguments
        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
            'vscode.diff',
            { path: 'tempFilePath.ts' },
            originalUri,
            'Pre-Save vs Saved Comparison'
        );
    });
});
