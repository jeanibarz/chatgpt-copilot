// src/commands/ClearBrowserCommand.ts

import { injectable } from "inversify";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { CoreLogger } from "../logging/CoreLogger";

@injectable()
export class ClearBrowserCommand implements ICommand {
  public readonly type = ChatGPTCommandType.ClearBrowser;
  private logger: CoreLogger = CoreLogger.getInstance();

  public async execute(data: any): Promise<void> {
    this.logger.info('Browser cleared');
    // Further logic for clearing the browser can go here, if needed.
  }
}
