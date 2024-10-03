// src/commands/OpenSettingsCommand.ts

import { injectable } from "inversify";
import * as vscode from 'vscode';
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { CoreLogger } from '../logging/CoreLogger';

@injectable()
export class OpenSettingsCommand implements ICommand {
  public readonly type = ChatGPTCommandType.OpenSettings;
  private logger: CoreLogger = CoreLogger.getInstance();

  public async execute(data: any): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:jeanibarz.chatgpt-copilot chatgpt.');
    this.logger.info('Settings opened');
  }
}
