// src/commands/OpenNewCommand.ts

import * as vscode from 'vscode';

import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class OpenNewCommand implements ICommand {
  public type = ChatGPTCommandType.OpenNew;

  public async execute(data: any, provider: ChatGptViewProvider) {
    const content = data.value || '';
    const language = data.language || '';
    const document = await vscode.workspace.openTextDocument({ content, language });
    vscode.window.showTextDocument(document);
    provider.logger.info(language === 'markdown' ? 'Markdown document opened' : 'Code document opened');
  }
}
