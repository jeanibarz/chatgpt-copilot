// src/commands/ShowConversationCommand.ts

import { injectable } from "inversify";
import * as vscode from 'vscode';
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { CoreLogger } from '../logging/CoreLogger';

@injectable()
export class ShowConversationCommand implements ICommand {
  public readonly type = ChatGPTCommandType.ShowConversation;
  private logger: CoreLogger = CoreLogger.getInstance();

  public async execute(data: any): Promise<void> {
    try {
      // Focus the webview or show it if it's already initialized
      await vscode.commands.executeCommand("chatgpt-copilot.view.focus");
      this.logger.info('ChatGPT conversation view focused or shown.');
    } catch (error) {
      this.logger.error(`Failed to focus or show the ChatGPT view: ${(error as Error).message}`);
    }
  }
}
