import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';
import { ICommand } from './ICommand';

export class ListConversationsCommand implements ICommand {
  public type = CommandType.ListConversations;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.logger.info('List conversations attempted');
  }
}
