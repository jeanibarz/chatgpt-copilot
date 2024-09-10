import * as vscode from 'vscode';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';
import { ICommand } from './ICommand';

export class OpenSettingsPromptCommand implements ICommand {
  public type = CommandType.OpenSettingsPrompt;

  public async execute(data: any, provider: ChatGptViewProvider) {
    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:jeanibarz.chatgpt-copilot promptPrefix');
    provider.logger.info('Prompt settings opened');
  }
}
