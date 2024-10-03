// src/commands/ClearGpt3Command.ts

import { injectable } from "inversify";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { CoreLogger } from "../logging/CoreLogger";

@injectable()
export class ClearGpt3Command implements ICommand {
  public readonly type = ChatGPTCommandType.ClearGpt3;
  private logger: CoreLogger = CoreLogger.getInstance();

  public async execute(data: any): Promise<void> {
    this.logger.info('GPT-3 model cleared');
  }
}
