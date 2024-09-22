// src/commands/__tests__/OpenSettingsCommand.test.ts

import * as vscode from 'vscode';
import { ChatGPTCommandType } from '../../interfaces/enums/ChatGPTCommandType';
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { OpenSettingsCommand } from '../OpenSettingsCommand';

// Mock the vscode API
jest.mock('vscode', () => ({
    commands: {
        executeCommand: jest.fn(),
    },
}));

// Mock the ChatGptViewProvider and its dependencies
const mockProvider = {
    logger: {
        info: jest.fn(),
    },
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('OpenSettingsCommand', () => {
    let command: OpenSettingsCommand;

    beforeEach(() => {
        command = new OpenSettingsCommand();
        jest.clearAllMocks(); // Clear mocks before each test to avoid interference
    });

    it('should have the correct command type', () => {
        expect(command.type).toBe(ChatGPTCommandType.OpenSettings);
    });

    it('should open settings and log the action', async () => {
        const data = {}; // No data needed for this command

        // Call the execute method
        await command.execute(data, mockProvider);

        // Ensure executeCommand is called with the correct command to open settings
        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
            'workbench.action.openSettings',
            '@ext:jeanibarz.chatgpt-copilot chatgpt.'
        );

        // Ensure logger.info was called with the correct message
        expect(mockProvider.logger.info).toHaveBeenCalledWith('Settings opened');
    });
});
