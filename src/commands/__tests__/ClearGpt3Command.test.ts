import { ChatGPTCommandType } from "../../interfaces/enums/ChatGPTCommandType";
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { ClearGpt3Command } from '../ClearGpt3Command';

// Mock the ChatGptViewProvider and its dependencies
const mockProvider = {
    apiCompletion: jest.fn(),
    apiChat: jest.fn(),
    logger: {
        info: jest.fn(),
    },
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('ClearGpt3Command', () => {
    let command: ClearGpt3Command;

    beforeEach(() => {
        command = new ClearGpt3Command();
        jest.clearAllMocks();  // Clear mock function calls between tests
    });

    it('should have the correct command type', () => {
        // Check that the command type is set correctly
        expect(command.type).toBe(ChatGPTCommandType.ClearGpt3);
    });

    it('should clear apiCompletion and apiChat when executed', async () => {
        const data = {};  // Data is not used in this case

        // Set some initial values for apiCompletion and apiChat
        mockProvider.apiCompletion = jest.fn() as any;
        mockProvider.apiChat = jest.fn() as any;

        // Call the execute method with mock data and provider
        await command.execute(data, mockProvider);

        // Ensure apiCompletion and apiChat are set to undefined
        expect(mockProvider.apiCompletion).toBeUndefined();
        expect(mockProvider.apiChat).toBeUndefined();
    });

    it('should log "GPT-3 cleared" when executed', async () => {
        const data = {};  // Data is not used in this case

        // Call the execute method with mock data and provider
        await command.execute(data, mockProvider);

        // Ensure that logger.info was called with the correct message
        expect(mockProvider.logger.info).toHaveBeenCalledWith('GPT-3 cleared');
    });
});
