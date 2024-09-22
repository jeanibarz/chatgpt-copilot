// src/commands/ClearConversationCommand.ts

import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class ClearConversationCommand implements ICommand {
  public type = ChatGPTCommandType.ClearConversation;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.conversationId = undefined;
    provider.chatHistoryManager.clearHistory();
    provider.logger.info('Conversation cleared');
  }
}
