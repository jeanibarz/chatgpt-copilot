import { ChatGPTCommandType } from "../../interfaces/enums/ChatGPTCommandType";
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { ClearConversationCommand } from '../ClearConversationCommand';

// Mock the ChatGptViewProvider and its dependencies
const mockProvider = {
    conversationId: 'mock-conversation-id',
    chatHistoryManager: {
        clearHistory: jest.fn(),
    },
    logger: {
        info: jest.fn(),
    },
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('ClearConversationCommand', () => {
    let command: ClearConversationCommand;

    beforeEach(() => {
        command = new ClearConversationCommand();
        jest.clearAllMocks();  // Clear mock function calls between tests
    });

    it('should have the correct command type', () => {
        // Check that the command type is set correctly
        expect(command.type).toBe(ChatGPTCommandType.ClearConversation);
    });

    it('should clear the conversationId and chat history when executed', async () => {
        const data = {};  // You can pass any data, it isn't used in this case

        // Ensure the conversationId is set initially
        expect(mockProvider.conversationId).toBe('mock-conversation-id');

        // Call the execute method with mock data and provider
        await command.execute(data, mockProvider);

        // Ensure conversationId is set to undefined
        expect(mockProvider.conversationId).toBeUndefined();

        // Ensure chatHistoryManager.clearHistory is called
        expect(mockProvider.chatHistoryManager.clearHistory).toHaveBeenCalled();
    });

    it('should log "Conversation cleared" when executed', async () => {
        const data = {};  // Data isn't used in this case

        // Call the execute method with mock data and provider
        await command.execute(data, mockProvider);

        // Ensure that logger.info was called with the correct message
        expect(mockProvider.logger.info).toHaveBeenCalledWith('Conversation cleared');
    });
});
