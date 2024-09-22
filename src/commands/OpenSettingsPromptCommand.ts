// src/commands/OpenSettingsPromptCommand.ts

import * as vscode from 'vscode';

import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class OpenSettingsPromptCommand implements ICommand {
  public type = ChatGPTCommandType.OpenSettingsPrompt;

  public async execute(data: any, provider: ChatGptViewProvider) {
    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:jeanibarz.chatgpt-copilot promptPrefix');
    provider.logger.info('Prompt settings opened');
  }
}
