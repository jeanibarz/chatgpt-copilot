// src/commands/__tests__/ShowConversationCommand.test.ts

import * as vscode from 'vscode';
import { ChatGPTCommandType } from '../../interfaces/enums/ChatGPTCommandType';
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { ShowConversationCommand } from '../ShowConversationCommand';

// Mock the vscode API
jest.mock('vscode', () => ({
    commands: {
        executeCommand: jest.fn(),
    },
}));

// Mock the ChatGptViewProvider and its dependencies
const mockProvider = {
    webView: undefined,
    logger: {
        logError: jest.fn(),
    },
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('ShowConversationCommand', () => {
    let command: ShowConversationCommand;

    beforeEach(() => {
        command = new ShowConversationCommand();
        jest.clearAllMocks(); // Clear mocks before each test to avoid interference
    });

    it('should have the correct command type', () => {
        expect(command.type).toBe(ChatGPTCommandType.ShowConversation);
    });

    it('should execute the focus command if webView is undefined', async () => {
        mockProvider.webView = undefined; // Simulate webView not being initialized

        // Call the execute method
        await command.execute({}, mockProvider);

        // Ensure the focus command was executed
        expect(vscode.commands.executeCommand).toHaveBeenCalledWith("chatgpt-copilot.view.focus");

        // Ensure webView.show was not called
        expect(mockProvider.webView).toBeUndefined();
    });

    it('should call show on the webView if it is initialized', async () => {
        mockProvider.webView = {
            show: jest.fn(),
            viewType: 'test-view',
            webview: {} as any, // mock as needed
            onDidDispose: jest.fn(),
            visible: true,
            onDidChangeVisibility: jest.fn(),
        }; // Simulate webView being available

        // Call the execute method
        await command.execute({}, mockProvider);

        // Ensure the focus command was not executed
        expect(vscode.commands.executeCommand).not.toHaveBeenCalled();

        // Ensure webView.show was called with the correct argument
        expect(mockProvider.webView.show).toHaveBeenCalledWith(true);
    });

    it('should log an error if an exception occurs during execution', async () => {
        const error = new Error('Test error');
        mockProvider.webView = undefined;

        // Simulate an error being thrown by executeCommand
        (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(error);

        // Call the execute method
        await command.execute({}, mockProvider);

        // Ensure the error is logged
        expect(mockProvider.logger.logError).toHaveBeenCalledWith(error, "Failed to focus or show the ChatGPT view", true);
    });
});
