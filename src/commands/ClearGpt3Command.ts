// File: src/commands/ClearGpt3Command.ts

import { ICommand } from './ICommand';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';

export class ClearGpt3Command implements ICommand {
  public type = CommandType.ClearGpt3;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.apiCompletion = undefined;
    provider.apiChat = undefined;
    provider.logger.info('GPT-3 cleared');
  }
}
