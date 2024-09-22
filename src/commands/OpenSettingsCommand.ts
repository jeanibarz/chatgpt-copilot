// src/commands/OpenSettingsCommand.ts

import * as vscode from 'vscode';

import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class OpenSettingsCommand implements ICommand {
  public type = ChatGPTCommandType.OpenSettings;

  public async execute(data: any, provider: ChatGptViewProvider) {
    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:jeanibarz.chatgpt-copilot chatgpt.');
    provider.logger.info('Settings opened');
  }
}
