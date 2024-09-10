// File: src/commands/OpenSettingsCommand.ts

import { ICommand } from './ICommand';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';
import * as vscode from 'vscode';

export class OpenSettingsCommand implements ICommand {
  public type = CommandType.OpenSettings;

  public async execute(data: any, provider: ChatGptViewProvider) {
    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:jeanibarz.chatgpt-copilot chatgpt.');
    provider.logger.info('Settings opened');
  }
}
