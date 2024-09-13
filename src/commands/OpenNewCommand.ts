import * as vscode from 'vscode';
import { ChatGptViewProvider, CommandType } from '../view/ChatGptViewProvider';
import { ICommand } from './ICommand';

export class OpenNewCommand implements ICommand {
  public type = CommandType.OpenNew;

  public async execute(data: any, provider: ChatGptViewProvider) {
    const content = data.value || '';
    const language = data.language || '';
    const document = await vscode.workspace.openTextDocument({ content, language });
    vscode.window.showTextDocument(document);
    provider.logger.info(language === 'markdown' ? 'Markdown document opened' : 'Code document opened');
  }
}
