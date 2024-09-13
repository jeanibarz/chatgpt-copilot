import { ChatGptViewProvider, CommandType } from '../view/ChatGptViewProvider';
import { ICommand } from './ICommand';

export class ClearConversationCommand implements ICommand {
  public type = CommandType.ClearConversation;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.conversationId = undefined;
    provider.chatHistoryManager.clearHistory();
    provider.logger.info('Conversation cleared');
  }
}
