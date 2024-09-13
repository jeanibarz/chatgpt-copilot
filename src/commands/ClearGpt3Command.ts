import { ChatGptViewProvider, CommandType } from '../view/ChatGptViewProvider';
import { ICommand } from './ICommand';

export class ClearGpt3Command implements ICommand {
  public type = CommandType.ClearGpt3;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.apiCompletion = undefined;
    provider.apiChat = undefined;
    provider.logger.info('GPT-3 cleared');
  }
}
