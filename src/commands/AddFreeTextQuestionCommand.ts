// src/commands/AddFreeTestQuestionCommand.ts

import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class AddFreeTextQuestionCommand implements ICommand {
  public type = ChatGPTCommandType.AddFreeTextQuestion;

  public async execute(data: any, provider: ChatGptViewProvider) {
    const question = data.value;
    if (!provider.configurationManager.conversationHistoryEnabled) {
      provider.chatHistoryManager.clearHistory();
    }

    await provider.sendApiRequest(question, { command: ChatGPTCommandType.AddFreeTextQuestion });
  }
}
