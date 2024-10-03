// src/commands/LoginCommand.ts

import { injectable } from "inversify";
import { ConversationManager } from "../ConversationManager";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { container } from "../inversify.config";
import TYPES from "../inversify.types";
import { CoreLogger } from '../logging/CoreLogger';

@injectable()
export class LoginCommand implements ICommand {
  public readonly type = ChatGPTCommandType.Login;
  private logger: CoreLogger = CoreLogger.getInstance();

  constructor() { }

  public async execute(data: any): Promise<void> {
    try {
      // Send a request to prepare the conversation
      const success = await container.get<ConversationManager>(TYPES.ConversationManager).prepareConversation();

      if (success) {
        this.logger.info('Logged in and conversation prepared successfully');
        // Further actions on successful preparation, such as updating the UI or sending a message
      } else {
        this.logger.warn('Failed to prepare the conversation during login');
      }
    } catch (error) {
      this.logger.error(`Failed to prepare conversation during login: ${(error as Error).message}`);
    }
  }
}
