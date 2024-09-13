import * as vscode from 'vscode';
import { ChatGptViewProvider, CommandType } from '../view/ChatGptViewProvider';
import { ICommand } from './ICommand';

export class EditCodeCommand implements ICommand {
  public type = CommandType.EditCode;

  public async execute(data: any, provider: ChatGptViewProvider) {
    const code = data.value;
    const escapedString = code.replace(/\$/g, '\\$');
    vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(escapedString));
    provider.logger.info('Code inserted');
  }
}
