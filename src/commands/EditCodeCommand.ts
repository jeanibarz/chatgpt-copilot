// File: src/commands/EditCodeCommand.ts

import { ICommand } from './ICommand';
import { ChatGptViewProvider, CommandType } from '../chatgptViewProvider';
import * as vscode from 'vscode';

export class EditCodeCommand implements ICommand {
  public type = CommandType.EditCode;

  public async execute(data: any, provider: ChatGptViewProvider) {
    const code = data.value;
    const escapedString = code.replace(/\$/g, '\\$');
    vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(escapedString));
    provider.logger.info('Code inserted');
  }
}
