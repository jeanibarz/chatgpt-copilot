// Full Path: /home/jean/git/chatgpt-copilot/src/controllers/__tests__/CommandHandler.test.ts
import { ChatGPTCommandType } from "../../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../../interfaces/ICommand';
import { CoreLogger } from '../../logging/CoreLogger';
import { ChatGptViewProvider } from '../../view/ChatGptViewProvider';
import { CommandHandler } from '../CommandHandler';

// Mock the vscode API
jest.mock('vscode', () => ({
  window: {
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn(),
    })),
  },
}));

// Mock command classes
class MockCommand implements ICommand {
  type: ChatGPTCommandType;
  constructor(type: ChatGPTCommandType) {
    this.type = type;
  }

  async execute(data: any, provider: ChatGptViewProvider) {
    // Mock implementation
  }
}

describe('CommandHandler', () => {
  let commandHandler: CommandHandler;
  let provider: ChatGptViewProvider;

  beforeEach(() => {
    provider = {} as ChatGptViewProvider; // Mock provider
    commandHandler = new CommandHandler(provider);
  });

  test('should register all commands', () => {
    // Check if the commands are registered correctly
    expect(commandHandler['commandMap'].size).toBeGreaterThan(0); // Ensure commands are registered
  });

  test('should execute a registered command', async () => {
    const commandType = ChatGPTCommandType.AddFreeTextQuestion; // Example command type
    const mockCommand = new MockCommand(commandType);
    commandHandler['commandMap'].set(commandType, mockCommand);

    // Mock the execute method to spy on its calls
    const executeSpy = jest.spyOn(mockCommand, 'execute');

    await commandHandler.executeCommand(commandType, { question: 'What is AI?' });

    expect(executeSpy).toHaveBeenCalledWith({ question: 'What is AI?' }, provider);
  });

  test('should log an error if provider is not set', async () => {
    const loggerSpy = jest.spyOn(CoreLogger.getInstance(), 'error');

    // Instead of setting the provider to undefined, we will just create a new CommandHandler without a provider.
    commandHandler = new CommandHandler(); // No provider is passed.

    await commandHandler.executeCommand(ChatGPTCommandType.AddFreeTextQuestion, {});

    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("Provider is not available"));
  });


  test('should log a warning if command type is not recognized', async () => {
    const loggerSpy = jest.spyOn(CoreLogger.getInstance(), 'warn');

    await commandHandler.executeCommand('unknownCommandType' as ChatGPTCommandType, {});

    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("No handler found for command type"));
  });
});
