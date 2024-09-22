// src/commands/EditCodeCommand.ts

import * as vscode from 'vscode';

import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { ChatGptViewProvider } from '../view/ChatGptViewProvider';

export class EditCodeCommand implements ICommand {
  public type = ChatGPTCommandType.EditCode;

  public async execute(data: any, provider: ChatGptViewProvider) {
    const code = data.value;
    const escapedString = code.replace(/\$/g, '\\$');
    vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(escapedString));
    provider.logger.info('Code inserted');
  }
}
