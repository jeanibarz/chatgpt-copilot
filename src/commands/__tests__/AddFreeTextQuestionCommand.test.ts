// src/commands/__tests__/AddFreeTextQuestionCommand.test.ts

// 1. Mock ChatModelFactory before any imports that might use it
jest.mock('../../models/llm_models/ChatModelFactory', () => ({
    // Mock the entire ChatModelFactory class with no-op implementations
    initialize: jest.fn(),
    createChatModel: jest.fn(),
    registerNormalizer: jest.fn(),
}));

// 2. Now import the modules that might trigger the ChatModelFactory code
import { ChatGPTCommandType } from "../../interfaces/enums/ChatGPTCommandType";
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { AddFreeTextQuestionCommand } from '../AddFreeTextQuestionCommand';

// 3. Mock the vscode API
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        })),
    },
}));

// 4. Mock the ChatGptViewProvider and its dependencies
const mockProvider = {
    configurationManager: {
        conversationHistoryEnabled: true,
    },
    chatHistoryManager: {
        clearHistory: jest.fn(),
    },
    sendApiRequest: jest.fn(),
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('AddFreeTextQuestionCommand', () => {
    let command: AddFreeTextQuestionCommand;

    beforeEach(() => {
        command = new AddFreeTextQuestionCommand();
        jest.clearAllMocks();  // Clear mocks before each test
    });

    it('should send API request with correct question when conversation history is enabled', async () => {
        const questionData = { value: 'What is AI?' };

        // Call the command's execute method with mock data and provider
        await command.execute(questionData, mockProvider);

        // Ensure sendApiRequest is called with the correct question and command
        expect(mockProvider.sendApiRequest).toHaveBeenCalledWith('What is AI?', { command: ChatGPTCommandType.AddFreeTextQuestion });

        // Ensure chatHistoryManager.clearHistory is not called since conversationHistoryEnabled is true
        expect(mockProvider.chatHistoryManager.clearHistory).not.toHaveBeenCalled();
    });

    it('should clear chat history if conversation history is not enabled', async () => {
        // Set conversationHistoryEnabled to false
        mockProvider.configurationManager.conversationHistoryEnabled = false;

        const questionData = { value: 'What is AI?' };

        // Call the command's execute method with mock data and provider
        await command.execute(questionData, mockProvider);

        // Ensure chatHistoryManager.clearHistory is called since conversationHistoryEnabled is false
        expect(mockProvider.chatHistoryManager.clearHistory).toHaveBeenCalled();

        // Ensure sendApiRequest is still called with the correct question and command
        expect(mockProvider.sendApiRequest).toHaveBeenCalledWith('What is AI?', { command: ChatGPTCommandType.AddFreeTextQuestion });
    });

    it('should handle empty question gracefully', async () => {
        const questionData = { value: '' };

        // Call the command's execute method with mock data and provider
        await command.execute(questionData, mockProvider);

        // Ensure sendApiRequest is called with an empty question and the correct command
        expect(mockProvider.sendApiRequest).toHaveBeenCalledWith('', { command: ChatGPTCommandType.AddFreeTextQuestion });
    });
});
