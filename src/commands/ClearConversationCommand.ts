// File: src/commands/ClearConversationCommand.ts

import { ICommand } from './ICommand';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';

export class ClearConversationCommand implements ICommand {
  public type = CommandType.ClearConversation;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.conversationId = undefined;
    provider.chatHistoryManager.clearHistory();
    provider.logger.info('Conversation cleared');
  }
}
