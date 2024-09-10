// File: src/commandHandler.ts

/**
 * This module handles command execution for the ChatGPT VS Code extension.
 * It defines various command classes that encapsulate specific actions 
 * that can be performed by the extension, such as adding questions, 
 * editing code, and managing conversations.
 * 
 * The `CommandHandler` class is responsible for managing and executing commands,
 * maintaining a mapping of command types to command instances. Each command 
 * class implements the `ICommand` interface, providing a consistent structure 
 * for command execution.
 * 
 * Key Features:
 * - Supports command registration and execution.
 * - Integrates with the `ChatGptViewProvider` to perform actions.
 * - Provides error handling for command execution.
 * 
 * Usage:
 * - The `CommandHandler` class initializes with a logger and a provider,
 *   registering all available commands upon construction.
 * - Commands can be executed by calling the `executeCommand` method with 
 *   the command type and associated data.
 */

import { ChatGptViewProvider, CommandType } from './chatgptViewProvider';
import { AddFreeTextQuestionCommand } from './commands/AddFreeTextQuestionCommand';
import { ClearBrowserCommand } from './commands/ClearBrowserCommand';
import { ClearConversationCommand } from './commands/ClearConversationCommand';
import { ClearGpt3Command } from './commands/ClearGpt3Command';
import { EditCodeCommand } from './commands/EditCodeCommand';
import { GenerateDocstringsCommand } from './commands/GenerateDocstringsCommand';
import { ICommand } from './commands/ICommand';
import { ListConversationsCommand } from './commands/ListConversationsCommand';
import { LoginCommand } from './commands/LoginCommand';
import { OpenNewCommand } from './commands/OpenNewCommand';
import { OpenSettingsCommand } from './commands/OpenSettingsCommand';
import { OpenSettingsPromptCommand } from './commands/OpenSettingsPromptCommand';
import { ShowConversationCommand } from './commands/ShowConversationCommand';
import { StopGeneratingCommand } from './commands/StopGeneratingCommand';
import { CoreLogger } from "./coreLogger";

const logger = CoreLogger.getInstance();

export class CommandHandler {
  private commandMap: Map<CommandType, ICommand>;

  constructor(private provider: ChatGptViewProvider) {
    this.commandMap = new Map();
    this.registerCommands();
  }

  private registerCommands() {
    this.registerCommand(new AddFreeTextQuestionCommand());
    this.registerCommand(new EditCodeCommand());
    this.registerCommand(new OpenNewCommand());
    this.registerCommand(new ClearConversationCommand());
    this.registerCommand(new ClearBrowserCommand());
    this.registerCommand(new ClearGpt3Command());
    this.registerCommand(new LoginCommand());
    this.registerCommand(new OpenSettingsCommand());
    this.registerCommand(new OpenSettingsPromptCommand());
    this.registerCommand(new ListConversationsCommand());
    this.registerCommand(new ShowConversationCommand());
    this.registerCommand(new StopGeneratingCommand());
    this.registerCommand(new GenerateDocstringsCommand());
  }

  private registerCommand(command: ICommand) {
    this.commandMap.set(command.type, command);
  }

  public async executeCommand(commandType: CommandType, data: any) {
    const command = this.commandMap.get(commandType);
    if (command) {
      await command.execute(data, this.provider);
    } else {
      logger.warn(`No handler found for command type: ${commandType}`);
    }
  }
}