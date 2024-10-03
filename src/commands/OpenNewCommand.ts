// src/commands/OpenNewCommand.ts

import { injectable } from "inversify";
import * as vscode from 'vscode';
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { CoreLogger } from '../logging/CoreLogger';

@injectable()
export class OpenNewCommand implements ICommand {
  public readonly type = ChatGPTCommandType.OpenNew;
  private logger: CoreLogger = CoreLogger.getInstance();

  public async execute(data: any): Promise<void> {
    const content = data.value || '';
    const language = data.language || '';
    const document = await vscode.workspace.openTextDocument({ content, language });
    await vscode.window.showTextDocument(document);
    this.logger.info(language === 'markdown' ? 'Markdown document opened' : 'Code document opened');
  }
}
