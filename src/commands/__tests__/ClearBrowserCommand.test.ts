import { ChatGPTCommandType } from "../../interfaces/enums/ChatGPTCommandType";
import { ChatGptViewProvider } from "../../view";
import { ClearBrowserCommand } from '../ClearBrowserCommand';

// Mock the vscode API
jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        })),
    },
}));

// Mock the ChatGptViewProvider and its logger
const mockProvider = {
    logger: {
        info: jest.fn(),
    },
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('ClearBrowserCommand', () => {
    let command: ClearBrowserCommand;

    beforeEach(() => {
        command = new ClearBrowserCommand();
        jest.clearAllMocks();  // Clear mock function calls between tests
    });

    it('should have the correct command type', () => {
        // Check that the command type is set correctly
        expect(command.type).toBe(ChatGPTCommandType.ClearBrowser);
    });

    it('should log "Browser cleared" when executed', async () => {
        const data = {};  // You can pass any data, it isn't used in this case

        // Call the execute method with mock data and provider
        await command.execute(data, mockProvider);

        // Ensure that logger.info was called with the correct message
        expect(mockProvider.logger.info).toHaveBeenCalledWith('Browser cleared');
    });
});
