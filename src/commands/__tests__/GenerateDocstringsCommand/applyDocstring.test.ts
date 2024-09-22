import * as vscode from 'vscode';
import { GenerateDocstringsCommand } from '../../GenerateDocstringsCommand';

jest.mock('vscode', () => ({
    WorkspaceEdit: jest.fn().mockImplementation(() => ({
        replace: jest.fn(),
    })),
    workspace: {
        applyEdit: jest.fn().mockResolvedValue(true),
    },
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        }))
    },
    Range: jest.fn(),
}));

describe('GenerateDocstringsCommand - applyDocstring', () => {
    let command: GenerateDocstringsCommand;

    beforeEach(() => {
        command = new GenerateDocstringsCommand();
        jest.clearAllMocks();
    });

    it('should apply the docstring as a workspace edit', async () => {
        const mockEditor = {
            document: {
                getText: jest.fn().mockReturnValue('mock document content'),
                uri: { fsPath: 'mockUri' },
                positionAt: jest.fn(),
            },
        } as unknown as vscode.TextEditor;

        const mockContent = 'Generated docstring';

        // Call the method
        const result = await command['applyDocstring'](mockEditor, mockContent);

        // Ensure the workspace edit was applied successfully
        expect(vscode.workspace.applyEdit).toHaveBeenCalled();

        // Ensure the method returns true for success
        expect(result).toBe(true);
    });
});
