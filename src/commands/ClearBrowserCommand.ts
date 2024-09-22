// src/commands/ClearBrowserCommand.ts

import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class ClearBrowserCommand implements ICommand {
  public type = ChatGPTCommandType.ClearBrowser;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.logger.info('Browser cleared');
  }
}
