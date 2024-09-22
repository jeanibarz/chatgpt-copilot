// src/commands/LoginCommand.ts

import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class LoginCommand implements ICommand {
  public type = ChatGPTCommandType.Login;

  public async execute(data: any, provider: ChatGptViewProvider) {
    const success = await provider.conversationManager.prepareConversation();
    if (success) {
      provider.sendMessage({ type: 'loginSuccessful', showConversations: false });
      provider.logger.info('Logged in successfully');
    }
  }
}
