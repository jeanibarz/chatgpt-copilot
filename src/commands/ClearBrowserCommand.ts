import { ChatGptViewProvider, CommandType } from '../view/ChatGptViewProvider';
import { ICommand } from './ICommand';

export class ClearBrowserCommand implements ICommand {
  public type = CommandType.ClearBrowser;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.logger.info('Browser cleared');
  }
}
