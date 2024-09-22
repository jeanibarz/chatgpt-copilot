// src/commands/ListConversationsCommand.ts

import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class ListConversationsCommand implements ICommand {
  public type = ChatGPTCommandType.ListConversations;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.logger.info('List conversations attempted');
  }
}
