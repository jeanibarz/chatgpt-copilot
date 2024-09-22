import { defaultSystemPromptForGenerateDocstring } from '../../../config/Configuration';
import { ChatGptViewProvider } from '../../../view/ChatGptViewProvider';
import { GenerateDocstringsCommand } from '../../GenerateDocstringsCommand';

jest.mock('vscode', () => ({
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            show: jest.fn(),
        }))
    }
}));

// Mock the provider
const mockProvider = {
    logger: {
        info: jest.fn(),
    },
    docstringGenerator: {
        generateDocstring: jest.fn(),
    },
} as unknown as jest.Mocked<ChatGptViewProvider>;

describe('GenerateDocstringsCommand - generateDocstring', () => {
    let command: GenerateDocstringsCommand;

    beforeEach(() => {
        command = new GenerateDocstringsCommand();
        jest.clearAllMocks();
    });

    it('should generate a docstring using the correct prompt', async () => {
        const mockText = 'This is the code to generate docstring for.';
        const mockGeneratedDocstring = 'Generated docstring';
        (mockProvider.docstringGenerator.generateDocstring as jest.Mock).mockResolvedValue(mockGeneratedDocstring);

        // Call the method
        const result = await command['generateDocstring'](mockText, mockProvider);

        // Ensure the prompt is generated correctly
        const expectedPrompt = `${defaultSystemPromptForGenerateDocstring}\n\n${mockText}\n\n`;
        expect(mockProvider.docstringGenerator.generateDocstring).toHaveBeenCalledWith(expectedPrompt);

        // Ensure the returned docstring is correct
        expect(result).toBe(mockGeneratedDocstring);
    });
});
