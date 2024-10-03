// src/commands/ListConversationsCommand.ts

import { injectable } from "inversify";
import { ChatGPTCommandType } from "../interfaces/enums/ChatGPTCommandType";
import { ICommand } from '../interfaces/ICommand';
import { CoreLogger } from "../logging/CoreLogger";

@injectable()
export class ListConversationsCommand implements ICommand {
  public readonly type = ChatGPTCommandType.ListConversations;
  private logger: CoreLogger = CoreLogger.getInstance();

  public async execute(data: any): Promise<void> {
    this.logger.info('List conversations attempted');
  }
}
