// src/controllers/CommandHandler.ts

/**
 * This module manages the execution of various commands related to the 
 * ChatGPT functionality within the extension. It maintains a registry of 
 * command instances and facilitates the execution of commands based on 
 * user interactions.
 */

import { injectable } from "inversify";
import { AddFreeTextQuestionCommand } from '../commands/AddFreeTextQuestionCommand';
import { ClearBrowserCommand } from '../commands/ClearBrowserCommand';
import { ClearConversationCommand } from '../commands/ClearConversationCommand';
import { ClearGpt3Command } from '../commands/ClearGpt3Command';
import { EditCodeCommand } from '../commands/EditCodeCommand';
import { GenerateDocstringsCommand } from '../commands/GenerateDocstringsCommand';
import { GenerateMermaidDiagramCommand } from "../commands/GenerateMermaidDiagramCommand";
import { ListConversationsCommand } from '../commands/ListConversationsCommand';
import { LoginCommand } from '../commands/LoginCommand';
import { OpenNewCommand } from '../commands/OpenNewCommand';
import { OpenSettingsCommand } from '../commands/OpenSettingsCommand';
import { OpenSettingsPromptCommand } from '../commands/OpenSettingsPromptCommand';
import { ShowConversationCommand } from '../commands/ShowConversationCommand';
import { StopGeneratingCommand } from '../commands/StopGeneratingCommand';
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { CoreLogger } from "../logging/CoreLogger";
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

const logger = CoreLogger.getInstance();

/**
 * The `CommandHandler` class manages the execution of various commands 
 * related to the ChatGPT functionality within the extension. It maintains
 * a registry of command instances and facilitates the execution of commands
 * based on user interactions.
 */
@injectable()
export class CommandHandler {
  private commandMap: Map<ChatGPTCommandType, ICommand>; // Map to store command instances
  private provider?: ChatGptViewProvider;

  /**
   * Constructor for the `CommandHandler` class.
   * Initializes a new instance and registers all available commands.
   * 
   * @param provider - An instance of `ChatGptViewProvider` for managing interactions.
   */
  constructor() {
    this.commandMap = new Map();
    this.registerCommands();
  }

  /**
   * Set the provider after the command handler has been instantiated.
   * 
   * @param provider - The ChatGptViewProvider instance.
   */
  public setProvider(provider: ChatGptViewProvider): void {
    this.provider = provider;
  }

  /**
   * Registers all command instances with their corresponding command types.
   */
  private registerCommands(): void {
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
    this.registerCommand(new GenerateMermaidDiagramCommand());
  }

  /**
   * Registers a command instance with the command map.
   * 
   * @param command - The command instance to register.
   */
  private registerCommand(command: ICommand): void {
    this.commandMap.set(command.type, command);
  }

  /**
   * Executes a command based on the provided command type and data.
   * 
   * @param commandType - The type of the command to execute.
   * @param data - The data associated with the command execution.
   */
  public async executeCommand(commandType: ChatGPTCommandType, data: any): Promise<void> {
    if (!this.provider) {
      logger.error(`Provider is not available, can't execute command ${commandType}`);
      return;
    }

    const command = this.commandMap.get(commandType);
    if (command) {
      await command.execute(data, this.provider);
    } else {
      logger.warn(`No handler found for command type: ${commandType}`);
    }
  }
}