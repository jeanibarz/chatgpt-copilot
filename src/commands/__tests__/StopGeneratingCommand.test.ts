// src/commands/__tests__/StopGeneratingCommand.test.ts

import { ChatGPTCommandType } from '../../interfaces/enums/ChatGPTCommandType';
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { StopGeneratingCommand } from '../StopGeneratingCommand';

// Mock the ChatGptViewProvider and its dependencies
const mockProvider = {
    abortController: {
        abort: jest.fn(),
    },
    sendMessage: jest.fn(),
    logger: {
        info: jest.fn(),
    },
    inProgress: true,
    response: 'Test response',
    currentMessageId: '12345',
    modelManager: {
        get isCodexModel() {
            return false; // Default to false initially
        },
    },
    configurationManager: {
        autoScroll: true,
    },
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('StopGeneratingCommand', () => {
    let command: StopGeneratingCommand;

    beforeEach(() => {
        command = new StopGeneratingCommand();
        jest.clearAllMocks(); // Clear mocks before each test to avoid interference
    });

    it('should have the correct command type', () => {
        expect(command.type).toBe(ChatGPTCommandType.StopGenerating);
    });

    it('should abort the ongoing process if abortController is defined', async () => {
        // Call the execute method
        await command.execute({}, mockProvider);

        // Ensure abortController.abort was called
        expect(mockProvider.abortController?.abort).toHaveBeenCalled();

        // Ensure inProgress is set to false
        expect(mockProvider.inProgress).toBe(false);

        // Ensure sendMessage was called to indicate the generation has stopped
        expect(mockProvider.sendMessage).toHaveBeenCalledWith({
            type: 'showInProgress',
            inProgress: false,
        });

        // Ensure sendMessage was called to add the response
        expect(mockProvider.sendMessage).toHaveBeenCalledWith({
            type: 'addResponse',
            value: mockProvider.response,
            done: true,
            id: mockProvider.currentMessageId,
            autoScroll: mockProvider.configurationManager.autoScroll,
            responseInMarkdown: true,
        });

        // Ensure logger.info was called to log the stop
        expect(mockProvider.logger.info).toHaveBeenCalledWith('Stopped generating');
    });

    it('should handle cases where abortController is not defined', async () => {
        mockProvider.abortController = undefined; // Simulate no abortController

        // Call the execute method
        await command.execute({}, mockProvider);

        // Ensure abortController.abort was not called
        expect(mockProvider.abortController).toBeUndefined();

        // Ensure inProgress is set to false
        expect(mockProvider.inProgress).toBe(false);

        // Ensure sendMessage was called to indicate the generation has stopped
        expect(mockProvider.sendMessage).toHaveBeenCalledWith({
            type: 'showInProgress',
            inProgress: false,
        });

        // Ensure sendMessage was called to add the response
        expect(mockProvider.sendMessage).toHaveBeenCalledWith({
            type: 'addResponse',
            value: mockProvider.response,
            done: true,
            id: mockProvider.currentMessageId,
            autoScroll: mockProvider.configurationManager.autoScroll,
            responseInMarkdown: true,
        });

        // Ensure logger.info was called to log the stop
        expect(mockProvider.logger.info).toHaveBeenCalledWith('Stopped generating');
    });

    it('should set responseInMarkdown to false if the model is Codex', async () => {
        // Mock the Codex model scenario by overriding isCodexModel
        jest.spyOn(mockProvider.modelManager, 'isCodexModel', 'get').mockReturnValue(true);

        // Call the execute method
        await command.execute({}, mockProvider);

        // Ensure sendMessage was called with responseInMarkdown set to false
        expect(mockProvider.sendMessage).toHaveBeenCalledWith({
            type: 'addResponse',
            value: mockProvider.response,
            done: true,
            id: mockProvider.currentMessageId,
            autoScroll: mockProvider.configurationManager.autoScroll,
            responseInMarkdown: false,
        });
    });
});
