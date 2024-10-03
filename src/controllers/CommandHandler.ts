// src/controllers/CommandHandler.ts

/**
 * This module manages the execution of various commands related to the 
 * ChatGPT functionality within the extension. It maintains a registry of 
 * command instances and facilitates the execution of commands based on 
 * user interactions.
 */

import { inject, injectable } from "inversify";
import { AddFreeTextQuestionCommand } from "../commands/AddFreeTextQuestionCommand";
import { ClearBrowserCommand } from "../commands/ClearBrowserCommand";
import { ClearConversationCommand } from "../commands/ClearConversationCommand";
import { ClearGpt3Command } from "../commands/ClearGpt3Command";
import { EditCodeCommand } from "../commands/EditCodeCommand";
import { GenerateDocstringsCommand } from "../commands/GenerateDocstringsCommand";
import { GenerateMermaidDiagramCommand } from "../commands/GenerateMermaidDiagramCommand";
import { GenerateMermaidDiagramsInFolderCommand } from "../commands/GenerateMermaidDiagramsInFolderCommand";
import { ListConversationsCommand } from "../commands/ListConversationsCommand";
import { LoginCommand } from "../commands/LoginCommand";
import { OpenNewCommand } from "../commands/OpenNewCommand";
import { OpenSettingsCommand } from "../commands/OpenSettingsCommand";
import { OpenSettingsPromptCommand } from "../commands/OpenSettingsPromptCommand";
import { ShowConversationCommand } from "../commands/ShowConversationCommand";
import { ConversationManager } from "../ConversationManager";
import { DocstringGenerator } from "../DocstringGenerator";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import TYPES from "../inversify.types";
import { CoreLogger } from "../logging/CoreLogger";
import { MermaidDiagramGenerator } from "../MermaidDiagramGenerator";

/**
 * The `CommandHandler` class manages the execution of various commands 
 * related to the ChatGPT functionality within the extension. It maintains
 * a registry of command instances and facilitates the execution of commands
 * based on user interactions.
 */
@injectable()
export class CommandHandler {
  private logger: CoreLogger = CoreLogger.getInstance();
  private commandMap: Map<ChatGPTCommandType, ICommand>;

  /**
   * Constructor for the `CommandHandler` class.
   * Initializes a new instance and registers all available commands.
   * 
   * @param logger - An instance of `CoreLogger` for logging events.
   * @param commands - The list of command instances to register.
   */
  constructor(
    @inject(TYPES.ConversationManager) private conversationManager: ConversationManager,
    @inject(TYPES.DocstringGenerator) private docstringGenerator: DocstringGenerator,
    @inject(TYPES.MermaidDiagramGenerator) private mermaidDiagramGenerator: MermaidDiagramGenerator,
  ) {
    this.commandMap = new Map();
  }

  /**
   * Manually registers all commands with the command map.
   */
  public registerAllCommands(): void {
    // Manually instantiate and register all commands
    this.registerCommand(new AddFreeTextQuestionCommand());
    this.registerCommand(new ClearBrowserCommand());
    this.registerCommand(new ClearConversationCommand(this.conversationManager));
    this.registerCommand(new ClearGpt3Command());
    this.registerCommand(new EditCodeCommand());
    this.registerCommand(new GenerateDocstringsCommand(this.docstringGenerator));
    this.registerCommand(new GenerateMermaidDiagramCommand(this.mermaidDiagramGenerator));
    this.registerCommand(new GenerateMermaidDiagramsInFolderCommand(this.mermaidDiagramGenerator));
    this.registerCommand(new ListConversationsCommand());
    this.registerCommand(new LoginCommand());
    this.registerCommand(new OpenNewCommand());
    this.registerCommand(new OpenSettingsCommand());
    this.registerCommand(new OpenSettingsPromptCommand());
    this.registerCommand(new ShowConversationCommand());
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
    const command = this.commandMap.get(commandType);
    if (command) {
      try {
        await command.execute(data);
      } catch (error) {
        this.logger.error(`Failed to execute command ${commandType}: ${(error as Error).message}`);
      }
    } else {
      this.logger.warn(`No handler found for command type: ${commandType}`);
    }
  }
}