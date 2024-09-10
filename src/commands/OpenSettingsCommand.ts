import * as vscode from 'vscode';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';
import { ICommand } from './ICommand';

export class OpenSettingsCommand implements ICommand {
  public type = CommandType.OpenSettings;

  public async execute(data: any, provider: ChatGptViewProvider) {
    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:jeanibarz.chatgpt-copilot chatgpt.');
    provider.logger.info('Settings opened');
  }
}
