// File: src/commands/ClearBrowserCommand.ts

import { ICommand } from './ICommand';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';

export class ClearBrowserCommand implements ICommand {
  public type = CommandType.ClearBrowser;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.logger.info('Browser cleared');
  }
}
