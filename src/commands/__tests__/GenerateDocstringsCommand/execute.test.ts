import * as vscode from 'vscode';
import { ChatGptViewProvider } from '../../../view/ChatGptViewProvider';
import { GenerateDocstringsCommand } from '../../GenerateDocstringsCommand';

// Mock necessary vscode APIs and internal methods
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        })),
        activeTextEditor: {
            document: {
                getText: jest.fn().mockReturnValue('mock pre-save content'),
                uri: { fsPath: 'mockUri' },
                save: jest.fn().mockResolvedValue(true),
                positionAt: jest.fn().mockImplementation((offset: number) => ({
                    line: Math.floor(offset / 10), // Mock implementation
                    character: offset % 10, // Mock implementation
                })),
            },
        },
        showErrorMessage: jest.fn(),
    },
    workspace: {
        applyEdit: jest.fn().mockResolvedValue(true),
        onDidCloseTextDocument: jest.fn(),
    },
    commands: {
        executeCommand: jest.fn(),
    },
    Uri: {
        file: jest.fn(),
    },
    Range: jest.fn().mockImplementation(() => ({})),
    WorkspaceEdit: jest.fn().mockImplementation(() => ({
        replace: jest.fn(),
    })),
}));

// Mock fs
jest.mock('fs', () => ({
    writeFileSync: jest.fn(),
    unlink: jest.fn((_, callback) => callback(null)),
}));

// Mock ChatGptViewProvider
const mockProvider = {
    logger: {
        info: jest.fn(),
    },
    getActiveEditorText: jest.fn().mockResolvedValue('mock editor text'),
    docstringGenerator: {
        generateDocstring: jest.fn().mockResolvedValue('mock generated docstring'),
    },
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('GenerateDocstringsCommand - execute', () => {
    let command: GenerateDocstringsCommand;
    let originalActiveTextEditor: typeof vscode.window.activeTextEditor;

    beforeEach(() => {
        command = new GenerateDocstringsCommand();
        originalActiveTextEditor = vscode.window.activeTextEditor; // Save original value
        jest.clearAllMocks();
    });

    afterEach(() => {
        vscode.window.activeTextEditor = originalActiveTextEditor; // Restore original value
    });

    it('should show an error if there is no active editor', async () => {
        // Temporarily set activeTextEditor to undefined
        (vscode.window as any).activeTextEditor = undefined;

        await command.execute({}, mockProvider);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No active editor found.');
    });

    it('should show an error if no text is found in the active editor', async () => {
        mockProvider.getActiveEditorText.mockResolvedValueOnce('');

        await command.execute({}, mockProvider);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No text found in the active editor.');
    });

    it('should show an error if applying docstring fails', async () => {
        jest.spyOn(command as any, 'applyDocstring').mockResolvedValueOnce(false);

        await command.execute({}, mockProvider);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to update the document with the new docstring.');
    });

    it('should show an error if saving the document fails', async () => {
        (vscode.window.activeTextEditor!.document.save as jest.Mock).mockResolvedValueOnce(false);

        await command.execute({}, mockProvider);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('File could not be saved.');
    });

    it('should call the necessary methods in order', async () => {
        jest.spyOn(command as any, 'createTempFile').mockReturnValue('mock-temp-file');
        jest.spyOn(command as any, 'applyDocstring').mockResolvedValue(true);
        jest.spyOn(command as any, 'showDiff').mockResolvedValue(undefined);
        jest.spyOn(command as any, 'cleanupTempFile').mockImplementation(() => { });

        await command.execute({}, mockProvider);

        // Ensure createTempFile is called with pre-save content
        expect(command['createTempFile']).toHaveBeenCalledWith('mock pre-save content');

        // Ensure docstring generation is called with the correct arguments
        expect(mockProvider.docstringGenerator.generateDocstring).toHaveBeenCalledWith(expect.any(String));

        // Ensure applyDocstring is called
        expect(command['applyDocstring']).toHaveBeenCalled();

        // Ensure document is saved
        expect(vscode.window.activeTextEditor!.document.save).toHaveBeenCalled();

        // Ensure diff is shown
        expect(command['showDiff']).toHaveBeenCalledWith(vscode.window.activeTextEditor!.document.uri, 'mock-temp-file');

        // Ensure cleanupTempFile is called
        expect(command['cleanupTempFile']).toHaveBeenCalledWith('mock-temp-file');
    });
});
