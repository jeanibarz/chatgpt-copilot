// File: src/commands/OpenSettingsPromptCommand.ts

import { ICommand } from './ICommand';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';
import * as vscode from 'vscode';

export class OpenSettingsPromptCommand implements ICommand {
  public type = CommandType.OpenSettingsPrompt;

  public async execute(data: any, provider: ChatGptViewProvider) {
    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:jeanibarz.chatgpt-copilot promptPrefix');
    provider.logger.info('Prompt settings opened');
  }
}
