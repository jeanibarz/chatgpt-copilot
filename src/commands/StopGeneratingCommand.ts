// File: src/commands/StopGeneratingCommand.ts

import { ICommand } from './ICommand';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';

export class StopGeneratingCommand implements ICommand {
  public type = CommandType.StopGenerating;

  public async execute(data: any, provider: ChatGptViewProvider) {
    if (provider.abortController) {
      provider.abortController.abort();
    }
    provider.inProgress = false;
    provider.sendMessage({ type: 'showInProgress', inProgress: false });
    provider.logger.info('Stopped generating');
  }
}
