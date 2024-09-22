// src/commands/ClearGpt3Command.ts

import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class ClearGpt3Command implements ICommand {
  public type = ChatGPTCommandType.ClearGpt3;

  public async execute(data: any, provider: ChatGptViewProvider) {
    provider.apiCompletion = undefined;
    provider.apiChat = undefined;
    provider.logger.info('GPT-3 cleared');
  }
}
