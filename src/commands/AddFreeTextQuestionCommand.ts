// File: src/commands/AddFreeTextQuestionCommand.ts

import { ICommand } from './ICommand';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';

export class AddFreeTextQuestionCommand implements ICommand {
  public type = CommandType.AddFreeTextQuestion;

  public async execute(data: any, provider: ChatGptViewProvider) {
    const question = data.value;
    if (!provider.configurationManager.conversationHistoryEnabled) {
      provider.chatHistoryManager.clearHistory();
    }
    provider.chatHistoryManager.addMessage('user', question);
    await provider.sendApiRequest(question, { command: CommandType.AddFreeTextQuestion });
  }
}
