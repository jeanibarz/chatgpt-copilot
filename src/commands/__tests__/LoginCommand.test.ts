// src/commands/__tests__/LoginCommand.test.ts

import { ChatGPTCommandType } from '../../interfaces/enums/ChatGPTCommandType';
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { LoginCommand } from '../LoginCommand';

// Mock the ChatGptViewProvider and its dependencies
const mockProvider = {
    conversationManager: {
        prepareConversation: jest.fn(),
    },
    sendMessage: jest.fn(),
    logger: {
        info: jest.fn(),
    },
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('LoginCommand', () => {
    let command: LoginCommand;

    beforeEach(() => {
        command = new LoginCommand();
        jest.clearAllMocks(); // Clear mocks before each test to avoid interference
    });

    it('should have the correct command type', () => {
        expect(command.type).toBe(ChatGPTCommandType.Login);
    });

    it('should execute and log in successfully', async () => {
        // Mock prepareConversation to resolve to true (successful login)
        (mockProvider.conversationManager.prepareConversation as jest.Mock).mockResolvedValue(true);

        const data = {}; // Assuming no data is required for login

        // Call the execute method
        await command.execute(data, mockProvider);

        // Ensure prepareConversation was called
        expect(mockProvider.conversationManager.prepareConversation).toHaveBeenCalled();

        // Ensure sendMessage was called with the correct arguments
        expect(mockProvider.sendMessage).toHaveBeenCalledWith({ type: 'loginSuccessful', showConversations: false });

        // Ensure logger.info was called to log the success
        expect(mockProvider.logger.info).toHaveBeenCalledWith('Logged in successfully');
    });

    it('should not send login success message if login fails', async () => {
        // Mock prepareConversation to resolve to false (login failed)
        (mockProvider.conversationManager.prepareConversation as jest.Mock).mockResolvedValue(false);

        const data = {}; // Assuming no data is required for login

        // Call the execute method
        await command.execute(data, mockProvider);

        // Ensure prepareConversation was called
        expect(mockProvider.conversationManager.prepareConversation).toHaveBeenCalled();

        // Ensure sendMessage was not called since login failed
        expect(mockProvider.sendMessage).not.toHaveBeenCalled();

        // Ensure logger.info was not called since login failed
        expect(mockProvider.logger.info).not.toHaveBeenCalled();
    });
});
