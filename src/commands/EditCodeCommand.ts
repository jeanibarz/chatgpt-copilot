// src/commands/EditCodeCommand.ts

import { injectable } from "inversify";
import * as vscode from 'vscode';
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { CoreLogger } from "../logging/CoreLogger";

@injectable()
export class EditCodeCommand implements ICommand {
  public readonly type = ChatGPTCommandType.EditCode;
  private logger: CoreLogger = CoreLogger.getInstance();

  public async execute(data: any): Promise<void> {
    const code = data.value;
    const escapedString = code.replace(/\$/g, '\\$');
    vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(escapedString));
    this.logger.info('Code inserted');
  }
}
