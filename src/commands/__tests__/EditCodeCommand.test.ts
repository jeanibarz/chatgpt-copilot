// src/commands/__tests__EditCodeCommand.test.ts

import * as vscode from 'vscode';
import { ChatGPTCommandType } from "../../interfaces/enums/ChatGPTCommandType";
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { EditCodeCommand } from '../EditCodeCommand';

// Mock the vscode API
jest.mock('vscode', () => ({
    window: {
        activeTextEditor: {
            insertSnippet: jest.fn(),
        },
    },
    SnippetString: jest.fn().mockImplementation((value: string) => ({ value })),
}));

// Mock the ChatGptViewProvider and its dependencies
const mockProvider = {
    logger: {
        info: jest.fn(),
    },
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('EditCodeCommand', () => {
    let command: EditCodeCommand;

    beforeEach(() => {
        command = new EditCodeCommand();
        jest.clearAllMocks();  // Clear mock function calls between tests
    });

    it('should have the correct command type', () => {
        // Check that the command type is set correctly
        expect(command.type).toBe(ChatGPTCommandType.EditCode);
    });

    it('should insert code as a snippet into the active text editor', async () => {
        const data = { value: 'const x = 1;' };

        // Call the execute method with mock data and provider
        await command.execute(data, mockProvider);

        // Ensure that the activeTextEditor.insertSnippet is called with a SnippetString
        expect(vscode.window.activeTextEditor?.insertSnippet).toHaveBeenCalledWith(
            new vscode.SnippetString('const x = 1;')
        );
    });

    it('should escape `$` characters in the code', async () => {
        const data = { value: 'const x = `$value`;' };

        // Call the execute method with mock data and provider
        await command.execute(data, mockProvider);

        // Ensure that the activeTextEditor.insertSnippet is called with the escaped code
        expect(vscode.window.activeTextEditor?.insertSnippet).toHaveBeenCalledWith(
            new vscode.SnippetString('const x = `\\$value`;')
        );
    });

    it('should log "Code inserted" when executed', async () => {
        const data = { value: 'const x = 1;' };

        // Call the execute method with mock data and provider
        await command.execute(data, mockProvider);

        // Ensure that logger.info was called with the correct message
        expect(mockProvider.logger.info).toHaveBeenCalledWith('Code inserted');
    });
});
