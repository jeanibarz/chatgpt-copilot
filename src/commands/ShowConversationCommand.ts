// File: src/commands/ShowConversationCommand.ts

import { ICommand } from './ICommand';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';

export class ShowConversationCommand implements ICommand {
  public type = CommandType.ShowConversation;

  public async execute(data: any, provider: ChatGptViewProvider) {
    if (provider.webView == null)
