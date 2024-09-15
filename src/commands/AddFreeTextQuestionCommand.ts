import { ChatGptViewProvider, CommandType } from '../view/ChatGptViewProvider';
import { ICommand } from './ICommand';

export class AddFreeTextQuestionCommand implements ICommand {
  public type = CommandType.AddFreeTextQuestion;

  public async execute(data: any, provider: ChatGptViewProvider) {
    const question = data.value;
    if (!provider.configurationManager.conversationHistoryEnabled) {
      provider.chatHistoryManager.clearHistory();
    }
    
    await provider.sendApiRequest(question, { command: CommandType.AddFreeTextQuestion });
  }
}
