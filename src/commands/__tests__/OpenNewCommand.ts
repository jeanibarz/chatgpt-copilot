// src/commands/__tests__/OpenNewCommand.test.ts

import * as vscode from 'vscode';
import { ChatGPTCommandType } from '../../interfaces/enums/ChatGPTCommandType';
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { OpenNewCommand } from '../OpenNewCommand';

// Mock the vscode API
jest.mock('vscode', () => ({
    workspace: {
        openTextDocument: jest.fn(),
    },
    window: {
        showTextDocument: jest.fn(),
    },
}));

// Mock the ChatGptViewProvider and its dependencies
const mockProvider = {
    logger: {
        info: jest.fn(),
    },
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('OpenNewCommand', () => {
    let command: OpenNewCommand;

    beforeEach(() => {
        command = new OpenNewCommand();
        jest.clearAllMocks(); // Clear mocks before each test to avoid interference
    });

    it('should have the correct command type', () => {
        expect(command.type).toBe(ChatGPTCommandType.OpenNew);
    });

    it('should open a markdown document when language is "markdown"', async () => {
        const data = { value: 'Test markdown content', language: 'markdown' };
        const mockDocument = {}; // Mock document object

        // Mock openTextDocument to resolve to a mock document
        (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);

        // Call the execute method
        await command.execute(data);

        // Ensure openTextDocument is called with the correct parameters
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({ content: data.value, language: data.language });

        // Ensure showTextDocument is called with the mock document
        expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);

        // Ensure logger.info was called with the correct message
        expect(mockProvider.logger.info).toHaveBeenCalledWith('Markdown document opened');
    });

    it('should open a code document when language is not "markdown"', async () => {
        const data = { value: 'Test code content', language: 'javascript' };
        const mockDocument = {}; // Mock document object

        // Mock openTextDocument to resolve to a mock document
        (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);

        // Call the execute method
        await command.execute(data, mockProvider);

        // Ensure openTextDocument is called with the correct parameters
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({ content: data.value, language: data.language });

        // Ensure showTextDocument is called with the mock document
        expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);

        // Ensure logger.info was called with the correct message
        expect(mockProvider.logger.info).toHaveBeenCalledWith('Code document opened');
    });

    it('should handle empty content and language gracefully', async () => {
        const data = {}; // No value or language provided
        const mockDocument = {}; // Mock document object

        // Mock openTextDocument to resolve to a mock document
        (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);

        // Call the execute method
        await command.execute(data, mockProvider);

        // Ensure openTextDocument is called with empty content and language
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({ content: '', language: '' });

        // Ensure showTextDocument is called with the mock document
        expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);

        // Ensure logger.info was called with the code document opened message
        expect(mockProvider.logger.info).toHaveBeenCalledWith('Code document opened');
    });
});
