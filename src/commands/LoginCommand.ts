import { ChatGptViewProvider, CommandType } from '../view/ChatGptViewProvider';
import { ICommand } from './ICommand';

export class LoginCommand implements ICommand {
  public type = CommandType.Login;

  public async execute(data: any, provider: ChatGptViewProvider) {
    const success = await provider.conversationManager.prepareConversation();
    if (success) {
      provider.sendMessage({ type: 'loginSuccessful', showConversations: false });
      provider.logger.info('Logged in successfully');
    }
  }
}
