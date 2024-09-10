// File: src/commands/ListConversationsCommand.ts

import { ICommand } from './ICommand';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';

export class ListConversationsCommand implements ICommand {
  public type = CommandType.ListConversations;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.logger.info('List conversations attempted');
  }
}
